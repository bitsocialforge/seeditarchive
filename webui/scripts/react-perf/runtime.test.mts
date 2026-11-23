import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkBudgets } from './budgets.mts';
import { startFixtureApi, threadCid } from './fixture-api.mts';
import { parseScenario } from './types.mts';
import type { Summary } from './types.mts';

test('the native TypeScript performance entrypoint loads and handles help without a browser', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('./runner.mts', import.meta.url)), 'check', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /perf:check \| perf:record \| perf:test/);
});

test('repeated interrupts while the runner is busy still let it clean up and write its report', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'react-perf-interrupt-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // The runner's first external step is `git rev-parse`; this stand-in blocks
  // there, then names a checkout without the browser wrapper, so no browser,
  // lock or server is ever started.
  writeFileSync(
    path.join(root, 'git'),
    `#!/bin/bash\ntouch "${root}/started"\nwhile [ -d "${root}" ] && [ ! -e "${root}/continue" ]; do sleep 0.05; done\necho "${root}"\n`,
    { mode: 0o755 },
  );
  const output = path.join(root, 'report');
  const child = spawn(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('./runner.mts', import.meta.url)), 'selftest', '--output', output], {
    env: { ...process.env, PATH: `${root}${path.delimiter}${process.env.PATH ?? ''}` },
    stdio: 'ignore',
  });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let waited = 0; !existsSync(path.join(root, 'started')); waited += 20) {
    assert.ok(waited < 15_000, 'runner never reached its first external step');
    await pause(20);
  }
  child.kill('SIGINT');
  await pause(200);
  child.kill('SIGINT');
  await pause(200);
  writeFileSync(path.join(root, 'continue'), '');

  assert.deepEqual(await exited, { code: 1, signal: null });
  const report: unknown = JSON.parse(readFileSync(path.join(output, 'report.json'), 'utf8'));
  assert.ok(typeof report === 'object' && report !== null && 'ok' in report && 'error' in report);
  assert.equal(report.ok, false);
  assert.match(String(report.error), /Browser ownership wrapper missing/);
});

test('fixture API serves deterministic typed posts and rejects unknown routes', async () => {
  const fixture = await startFixtureApi();
  try {
    const response = await fetch(`${fixture.env.INDEXER_API}/api/posts/${threadCid}`);
    assert.equal(response.status, 200);
    const data: unknown = await response.json();
    assert.ok(typeof data === 'object' && data !== null && 'replies' in data);
    assert.ok(Array.isArray(data.replies));
    assert.equal(data.replies.length, 2);
    assert.equal((await fetch(`${fixture.env.INDEXER_API}/unknown`)).status, 404);
  } finally { await fixture.close(); }
});

test('malformed budgets and scenario exports fail closed', () => {
  const summary: Summary = { commits: 1, components: {}, instances: [], renderMs: 1, boundaries: {}, actionMs: 1 };
  assert.throws(() => checkBudgets(summary, { maxCommits: '2' }), /Invalid budget/);
  assert.throws(() => checkBudgets(summary, { components: { Probe: { maxUpdates: '2' } } }), /Invalid component budget/);
  assert.throws(() => checkBudgets(summary, { maxCommit: 2 }), /Unknown budget/);
  assert.throws(() => parseScenario({ name: 'broken', run: true }), /Invalid custom/);
  assert.deepEqual(checkBudgets(summary, { maxCommits: 0 }), ['commits: 1 exceeds 0']);
});
