/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

/**
 * Shared, dependency-free helpers for OmniPost's setup tooling.
 *
 * Everything here is defensive: no helper throws on the "expected" failure
 * paths (missing command, closed port, unreadable file). They return structured
 * results so callers can decide what's fatal. Pure Node ESM — runs anywhere
 * Node 20+ runs, no npm install required.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ----------------------------------------------------------------------------
// Paths
// ----------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const ENV_PATH = path.join(ROOT, '.env');
export const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

// ----------------------------------------------------------------------------
// Colored logging (auto-disabled when not a TTY or NO_COLOR is set)
// ----------------------------------------------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);

export const c = {
  dim: (s) => paint('2', s),
  bold: (s) => paint('1', s),
  red: (s) => paint('31', s),
  green: (s) => paint('32', s),
  yellow: (s) => paint('33', s),
  blue: (s) => paint('34', s),
  magenta: (s) => paint('35', s),
  cyan: (s) => paint('36', s),
};

let stepN = 0;
export const log = {
  banner(title, subtitle) {
    const width = Math.max(title.length, (subtitle ?? '').length);
    const bar = '─'.repeat(width + 4);
    console.log('');
    console.log(c.magenta(`┌${bar}┐`));
    console.log(c.magenta('│  ') + c.bold(title.padEnd(width)) + c.magenta('  │'));
    if (subtitle) console.log(c.magenta('│  ') + c.dim(subtitle.padEnd(width)) + c.magenta('  │'));
    console.log(c.magenta(`└${bar}┘`));
    console.log('');
  },
  step(msg) {
    stepN += 1;
    console.log(`${c.magenta(`[${stepN}]`)} ${c.bold(msg)}`);
  },
  info: (msg) => console.log(`    ${msg}`),
  ok: (msg) => console.log(`    ${c.green('✓')} ${msg}`),
  warn: (msg) => console.log(`    ${c.yellow('⚠')} ${msg}`),
  err: (msg) => console.log(`    ${c.red('✗')} ${msg}`),
  hint: (msg) => console.log(`      ${c.dim('↳ ' + msg)}`),
  blank: () => console.log(''),
};

// ----------------------------------------------------------------------------
// Process execution
// ----------------------------------------------------------------------------

/**
 * Run a command and capture output. Never throws — returns a result object.
 * Uses shell:true so `pnpm`, `npx`, `docker` resolve consistently on Windows.
 */
export function run(command, { cwd = ROOT, env = process.env, timeout } = {}) {
  try {
    const res = spawnSync(command, {
      cwd,
      env,
      shell: true,
      encoding: 'utf8',
      timeout,
      windowsHide: true,
    });
    return {
      ok: res.status === 0,
      code: res.status ?? -1,
      stdout: (res.stdout ?? '').trim(),
      stderr: (res.stderr ?? '').trim(),
      timedOut: res.error?.code === 'ETIMEDOUT',
      error: res.error ?? null,
    };
  } catch (err) {
    return { ok: false, code: -1, stdout: '', stderr: String(err?.message ?? err), error: err };
  }
}

/**
 * Run a long-lived command, streaming its output to the parent stdio so the
 * user sees progress (used for docker / prisma). Resolves with the exit code.
 */
export function runInherit(command, { cwd = ROOT, env = process.env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, env, shell: true, stdio: 'inherit', windowsHide: true });
    child.on('close', (code) => resolve({ ok: code === 0, code: code ?? -1 }));
    child.on('error', (err) => resolve({ ok: false, code: -1, error: err }));
  });
}

/** Does a CLI command exist on PATH? */
export function commandExists(cmd) {
  const probe = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`;
  return run(probe).ok;
}

// ----------------------------------------------------------------------------
// Networking — wait for a TCP port to accept connections
// ----------------------------------------------------------------------------

export function checkPort(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll a TCP port until it's open or we time out. Prints subtle progress dots.
 * Returns true on success, false on timeout — never throws.
 */
export async function waitForPort(label, host, port, { timeoutMs = 90_000, intervalMs = 1500 } = {}) {
  const start = Date.now();
  process.stdout.write(`    ${c.dim('waiting for')} ${label} ${c.dim(`(${host}:${port})`)} `);
  while (Date.now() - start < timeoutMs) {
    if (await checkPort(host, port)) {
      process.stdout.write(` ${c.green('ready')}\n`);
      return true;
    }
    process.stdout.write(c.dim('.'));
    await sleep(intervalMs);
  }
  process.stdout.write(` ${c.red('timeout')}\n`);
  return false;
}

// ----------------------------------------------------------------------------
// .env file management (preserves comments + user-set values)
// ----------------------------------------------------------------------------

/** Parse a dotenv file into an ordered list of { type, key, value, raw } lines. */
export function parseEnv(text) {
  return text.split(/\r?\n/).map((raw) => {
    const m = raw.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/i);
    if (m && !raw.trimStart().startsWith('#')) {
      return { type: 'kv', key: m[1], value: m[2], raw };
    }
    return { type: 'other', raw };
  });
}

export function readEnvLines() {
  if (!existsSync(ENV_PATH)) return null;
  try {
    return parseEnv(readFileSync(ENV_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function getEnvValue(lines, key) {
  const found = lines?.find((l) => l.type === 'kv' && l.key === key);
  return found ? found.value : undefined;
}

/**
 * Apply { KEY: value } updates to env lines. Existing keys are replaced in
 * place; missing keys are appended. Returns the new line array.
 */
export function applyEnvUpdates(lines, updates) {
  const out = lines.map((l) => ({ ...l }));
  const seen = new Set();
  for (const l of out) {
    if (l.type === 'kv' && Object.prototype.hasOwnProperty.call(updates, l.key)) {
      l.value = updates[l.key];
      l.raw = `${l.key}=${updates[l.key]}`;
      seen.add(l.key);
    }
  }
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push({ type: 'kv', key: k, value: v, raw: `${k}=${v}` });
  }
  return out;
}

export function writeEnvLines(lines) {
  const text = lines.map((l) => l.raw).join('\n');
  writeFileSync(ENV_PATH, text.endsWith('\n') ? text : text + '\n', 'utf8');
}

/**
 * Load the values from .env into process.env so spawned child processes
 * (prisma, seed) inherit them — Prisma in particular only auto-discovers a
 * .env in its own cwd, not the monorepo root. Values already present in
 * process.env win unless `override` is true. Returns the count loaded.
 */
export function loadDotenvIntoProcess({ override = true } = {}) {
  const lines = readEnvLines();
  if (!lines) return 0;
  let n = 0;
  for (const l of lines) {
    if (l.type !== 'kv') continue;
    const val = l.value.trim().replace(/^['"]|['"]$/g, '');
    if (override || process.env[l.key] === undefined) {
      process.env[l.key] = val;
      n += 1;
    }
  }
  return n;
}

/** Treat empty / "replace-me…" / "changeme" style values as unset. */
export function isPlaceholder(value) {
  if (value == null) return true;
  const v = value.trim().replace(/^['"]|['"]$/g, '');
  if (v === '') return true;
  return /replace[-_ ]?me|changeme|your[-_ ]?|xxxx|todo/i.test(v);
}

export { sleep, os };
