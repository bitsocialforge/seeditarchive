import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';

export const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const webuiDir = join(repoRoot, 'webui');
export const appLabel = 'seeditarchive';
export const isWindows = process.platform === 'win32';
export const usePortless = process.env.PORTLESS !== '0' && !isWindows;
export const executableSuffix = isWindows ? '.cmd' : '';
export const portlessBin = join(repoRoot, 'node_modules', '.bin', `portless${executableSuffix}`);
export const nextBin = join(webuiDir, 'node_modules', '.bin', `next${executableSuffix}`);
export const npmBin = `npm${executableSuffix}`;
export const fallbackHost = '127.0.0.1';
export const fallbackUrlHost = 'localhost';
export const portlessProxyPort = process.env.PORTLESS_PORT || '443';
export const portlessEnv = {
  ...process.env,
  PORTLESS_PORT: portlessProxyPort,
  PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? '1',
  PORTLESS_LAN: process.env.PORTLESS_LAN ?? '0',
};

export function getLocalServerCommand() {
  return usePortless && existsSync(portlessBin) ? portlessBin : nextBin;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * npm records what it actually installed in node_modules/.package-lock.json.
 * Compare it with the committed lockfile so pulling a dependency change
 * reinstalls instead of serving a stale tree (e.g. a newly added package that
 * fails with "Module not found"). Optional packages may be skipped per platform.
 */
function webuiDependenciesMatchLockfile() {
  const locked = readJson(join(webuiDir, 'package-lock.json'))?.packages;

  if (!locked) {
    return true;
  }

  const installed = readJson(join(webuiDir, 'node_modules', '.package-lock.json'))?.packages;

  if (!installed) {
    return false;
  }

  return Object.entries(locked).every(
    ([path, pkg]) => !path || pkg.optional || installed[path]?.version === pkg.version,
  );
}

/**
 * The web UI keeps its own npm lockfile (Vercel deploys `webui/` as the project
 * root), so the root yarn project never owns its dependencies. Install them on
 * demand instead of failing with a missing `next` binary or a stale tree.
 * `npm ci` is used when a lockfile is present so the pinned tree is reproduced
 * and never rewritten.
 */
export function ensureWebuiDependencies({ force = false } = {}) {
  if (!force && existsSync(nextBin) && webuiDependenciesMatchLockfile()) {
    return;
  }

  const hasLockfile = existsSync(join(webuiDir, 'package-lock.json'));
  const installArgs = hasLockfile ? ['ci'] : ['install'];

  console.log(`Installing webui dependencies (npm ${installArgs[0]} in webui/)...`);

  const result = spawnSync(npmBin, installArgs, {
    cwd: webuiDir,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readEnvFile(file) {
  if (!existsSync(file)) {
    return {};
  }

  const entries = {};

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);

    if (!match || line.trimStart().startsWith('#')) {
      continue;
    }

    entries[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }

  return entries;
}

/**
 * `next start` runs in production mode and therefore ignores `.env.development`.
 * Reproduce the dev instance config so `yarn start:preview` shows the same site
 * as `yarn start`; real environment variables still win.
 */
export function getPreviewEnvDefaults() {
  return {
    ...readEnvFile(join(webuiDir, '.env.development')),
    ...readEnvFile(join(webuiDir, '.env.local')),
  };
}

export function sanitizeLabel(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

export function getActivePortlessRouteHosts() {
  const result = spawnSync(portlessBin, ['list'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    return new Set();
  }

  const matches = result.stdout.match(/https?:\/\/[a-z0-9.-]+\.localhost(?::\d+)?/g) || [];

  return new Set(matches.map((url) => new URL(url).hostname));
}

export function isRouteBusy(activeRouteHosts, appName) {
  return activeRouteHosts.has(`${appName}.localhost`);
}

export function getPreferredPortlessAppName(activeRouteHosts) {
  const branch = getCurrentBranch();
  const branchLabel = sanitizeLabel(branch || 'current');

  if (branch && branch !== 'master' && branch !== 'main') {
    return `${branchLabel}.${appLabel}`;
  }

  if (isRouteBusy(activeRouteHosts, appLabel)) {
    return `${branchLabel}.${appLabel}`;
  }

  return appLabel;
}

export function getPortlessAppName() {
  const activeRouteHosts = getActivePortlessRouteHosts();
  const preferredAppName = getPreferredPortlessAppName(activeRouteHosts);

  if (!isRouteBusy(activeRouteHosts, preferredAppName)) {
    return preferredAppName;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${preferredAppName}-${suffix}`;

    if (!isRouteBusy(activeRouteHosts, candidate)) {
      return candidate;
    }
  }

  return `${preferredAppName}-${Date.now()}`;
}

export function ensurePortlessProxy() {
  const result = spawnSync(portlessBin, ['proxy', 'start', '--port', portlessProxyPort, '--https'], {
    cwd: repoRoot,
    env: portlessEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export async function waitForUrlReady(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const parsedUrl = new URL(url);
      const getUrl = parsedUrl.protocol === 'https:' ? httpsGet : httpGet;
      const onResponse = (response) => {
        response.resume();
        const statusCode = response.statusCode ?? 500;
        resolve(statusCode >= 200 && statusCode < 400);
      };
      const request =
        parsedUrl.protocol === 'https:' ? getUrl(parsedUrl, { rejectUnauthorized: false }, onResponse) : getUrl(parsedUrl, onResponse);

      request.on('error', () => resolve(false));
      request.setTimeout(2_000, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export function openInBrowser(url) {
  const opener =
    process.platform === 'darwin'
      ? { cmd: 'open', args: [url] }
      : process.platform === 'win32'
        ? { cmd: 'cmd', args: ['/c', 'start', '""', url] }
        : { cmd: 'xdg-open', args: [url] };

  spawn(opener.cmd, opener.args, { stdio: 'ignore', detached: true }).unref();
}

export function forwardChildExit(child) {
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}
