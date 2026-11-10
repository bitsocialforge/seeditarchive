import assert from 'node:assert/strict';
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const wrapper = fileURLToPath(new URL('./pw-session.sh', import.meta.url));

// A stand-in for playwright-cli: a browser is listed as open while
// open/<session> exists, and `open`/`close` block while a hold-* file exists,
// so a test can act while the wrapper is part-way through starting or stopping.
const stubCli = `#!/bin/bash
set -eu
dir="$PW_STUB_DIR"
if [ "\${1:-}" = list ]; then
  for file in "$dir"/open/*; do
    [ -e "$file" ] || continue
    printf -- '- %s:\\n  - status: open\\n' "\${file##*/}"
  done
  exit 0
fi
session="\${1#-s=}"
case "\${2:-}" in
  open)
    touch "$dir/opening-$session"
    while [ -e "$dir/hold-open-$session" ]; do sleep 0.05; done
    touch "$dir/open/$session"
    ;;
  close)
    rm -f "$dir/open/$session"
    touch "$dir/closing-$session"
    while [ -e "$dir/hold-close-$session" ]; do sleep 0.05; done
    ;;
esac
`;

function isolatedSlot(t: TestContext) {
  const root = mkdtempSync(path.join(tmpdir(), 'pw-session-'));
  const children: ChildProcess[] = [];
  t.after(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  });
  const state = path.join(root, 'stub');
  mkdirSync(path.join(state, 'open'), { recursive: true });
  const cli = path.join(root, 'playwright-cli');
  writeFileSync(cli, stubCli, { mode: 0o755 });
  const lock = path.join(root, 'playwright-session.lock');
  const env = { ...process.env, PLAYWRIGHT_RESOURCE_LOCK_DIR: lock, PLAYWRIGHT_CLI_BIN: cli, PW_STUB_DIR: state, PW_SESSION_POLL_SECONDS: '0' };
  return {
    lock,
    marker: (name: string) => path.join(state, name),
    owner: () => (existsSync(path.join(lock, 'owner')) ? readFileSync(path.join(lock, 'owner'), 'utf8').trim() : null),
    run: (...args: string[]) => spawnSync('bash', [wrapper, ...args], { cwd: root, env, encoding: 'utf8', timeout: 20_000 }),
    start: (...args: string[]) => {
      const child = spawn('bash', [wrapper, ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      children.push(child);
      let output = '';
      child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
      return {
        exit: () => new Promise<{ code: number | null; output: string }>((resolve) => {
          if (child.exitCode !== null) resolve({ code: child.exitCode, output });
          else child.once('exit', (code) => resolve({ code, output }));
        }),
      };
    },
  };
}

async function waitFor(file: string) {
  const deadline = Date.now() + 10_000;
  while (!existsSync(file)) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${file}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

test('a session still starting its browser keeps the slot', async (t) => {
  const slot = isolatedSlot(t);
  writeFileSync(slot.marker('hold-open-first'), '');
  const first = slot.start('open', 'first');
  await waitFor(slot.marker('opening-first'));

  // The first browser is not listed as open yet; that must not read as stale.
  const second = slot.run('open', 'second');
  assert.equal(second.status, 75, second.stderr);
  assert.equal(existsSync(slot.marker('opening-second')), false);

  rmSync(slot.marker('hold-open-first'));
  const opened = await first.exit();
  assert.equal(opened.code, 0, opened.output);
  assert.equal(slot.owner(), 'first');
  assert.equal(slot.run('open', 'second').status, 75);
});

test('a session still stopping its browser keeps the slot until it releases it', async (t) => {
  const slot = isolatedSlot(t);
  assert.equal(slot.run('open', 'first').status, 0);
  writeFileSync(slot.marker('hold-close-first'), '');
  const closing = slot.start('close', 'first');
  await waitFor(slot.marker('closing-first'));

  // The browser is gone but the closing wrapper has not released yet.
  const second = slot.run('open', 'second');
  assert.equal(second.status, 75, second.stderr);

  rmSync(slot.marker('hold-close-first'));
  const closed = await closing.exit();
  assert.equal(closed.code, 0, closed.output);
  assert.match(closed.output, /released browser slot for 'first'/);
  assert.equal(existsSync(slot.lock), false);
  assert.equal(slot.run('open', 'second').status, 0);
  assert.equal(slot.owner(), 'second');
});

test('a slot whose browser and wrapper are both gone is still reclaimed', (t) => {
  const slot = isolatedSlot(t);
  assert.equal(slot.run('open', 'crashed').status, 0);
  // The browser died without `close`; its open wrapper exited long ago.
  rmSync(slot.marker('open/crashed'));

  const next = slot.run('open', 'next');
  assert.equal(next.status, 0, next.stderr);
  assert.match(next.stderr, /reclaimed stale slot from 'crashed'/);
  assert.equal(slot.owner(), 'next');
});

test('a lock left without an owner or a running wrapper is reclaimed after a short settle', (t) => {
  const slot = isolatedSlot(t);
  mkdirSync(slot.lock);

  const next = slot.run('open', 'next');
  assert.equal(next.status, 0, next.stderr);
  assert.equal(slot.owner(), 'next');
  assert.equal(existsSync(path.join(slot.lock, 'pid')), false, 'an open browser holds the slot without a wrapper PID');
});
