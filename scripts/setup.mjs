#!/usr/bin/env node
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
 * OmniPost one-command setup.
 *
 *   pnpm setup            # full zero-touch setup (mock mode, demo seed)
 *   pnpm setup --reset    # wipe docker volumes and start fresh
 *   pnpm setup --skip-infra   # don't touch docker (BYO Postgres/Redis/S3)
 *   pnpm setup --no-seed      # skip demo seeding
 *   pnpm setup --production   # MOCK_MODE=false (real OAuth)
 *   pnpm setup --no-docker-autostart   # don't try to launch Docker Desktop
 *
 * Every step is defensive: secrets are generated only if missing, Docker is
 * auto-started when possible, the DB is polled until ready, and the schema is
 * synced with a retry. Nothing here requires the user to edit a file by hand.
 *
 * Exit codes: 0 = success or "partial, here's what's left"; 1 = a hard,
 * unrecoverable error (printed with remediation).
 */
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import {
  ROOT,
  ENV_PATH,
  ENV_EXAMPLE_PATH,
  c,
  log,
  run,
  runInherit,
  commandExists,
  waitForPort,
  checkPort,
  readEnvLines,
  getEnvValue,
  applyEnvUpdates,
  writeEnvLines,
  parseEnv,
  isPlaceholder,
  loadDotenvIntoProcess,
  sleep,
} from './lib.mjs';

const args = new Set(process.argv.slice(2));
const FLAGS = {
  reset: args.has('--reset'),
  skipInfra: args.has('--skip-infra'),
  noSeed: args.has('--no-seed'),
  production: args.has('--production'),
  noDockerAutostart: args.has('--no-docker-autostart'),
};

const results = []; // { name, status: 'ok'|'warn'|'fail', detail? }
const note = (name, status, detail) => results.push({ name, status, detail });

// Default local infra endpoints (match docker-compose.yml host ports —
// deliberately off the standard 5432/6379/9000 to avoid collisions).
const PORTS = [
  { label: 'PostgreSQL', host: '127.0.0.1', port: 5433, required: true },
  { label: 'Redis', host: '127.0.0.1', port: 6380, required: true },
  { label: 'MinIO (S3)', host: '127.0.0.1', port: 9100, required: false },
];

main().catch((err) => {
  log.blank();
  log.err(`Unexpected error: ${err?.stack ?? err}`);
  log.hint('This is a bug in setup.mjs — please open an issue with the trace above.');
  process.exit(1);
});

async function main() {
  log.banner('OmniPost · setup', 'one command, zero manual edits');

  preflight();
  await installDeps();
  ensureEnv();
  // Make .env values visible to every child process we spawn (prisma reads
  // DATABASE_URL from its own cwd otherwise, and won't find the root .env).
  const loaded = loadDotenvIntoProcess();
  log.hint(`loaded ${loaded} env vars for child processes`);

  // Offline-safe build steps — run regardless of infra so the repo is always
  // left in a compilable state even if the DB never comes up.
  const generated = await prismaGenerate();
  const built = generated ? await buildSharedPackages() : false;

  let infraUp = true;
  if (FLAGS.skipInfra) {
    log.step('Infrastructure');
    log.warn('--skip-infra: assuming you provide Postgres / Redis / S3 yourself.');
    note('infra', 'warn', 'skipped (--skip-infra)');
    infraUp = await probeExistingInfra();
  } else {
    infraUp = await ensureInfra();
  }

  let schemaOk = false;
  let seedOk = false;
  if (infraUp) {
    schemaOk = await dbPush();
    if (schemaOk && built && !FLAGS.noSeed) {
      seedOk = await seedDemo();
    } else if (FLAGS.noSeed) {
      note('seed', 'warn', 'skipped (--no-seed)');
    } else if (!built) {
      note('seed', 'warn', 'skipped — shared packages not built');
    }
  } else {
    note('schema', 'warn', 'skipped — database not reachable');
    note('seed', 'warn', 'skipped — database not reachable');
  }

  summary({ infraUp, schemaOk, seedOk });
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------
async function installDeps() {
  log.step('Dependencies');
  if (existsSync(`${ROOT}/node_modules`) && existsSync(`${ROOT}/node_modules/.modules.yaml`)) {
    log.ok('node_modules present — skipping install');
    note('install', 'ok', 'already installed');
    return;
  }
  log.info('Installing workspace dependencies (pnpm install)…');
  const res = await runInherit('pnpm install');
  if (res.ok) {
    log.ok('Dependencies installed');
    note('install', 'ok');
  } else {
    log.err('pnpm install failed.');
    log.hint('Run `corepack enable` then `pnpm install` manually to see the full error.');
    note('install', 'fail');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Prisma client generation (offline-safe)
// ---------------------------------------------------------------------------
async function prismaGenerate() {
  log.step('Prisma client');
  // On Windows the query-engine DLL can be transiently locked by a running
  // worker/dev process, yielding EPERM on rename. Retry a few times.
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await runInherit('pnpm --filter @omnipost/db prisma:generate');
    if (res.ok) {
      log.ok('Prisma client generated');
      note('prisma-generate', 'ok');
      return true;
    }
    if (attempt < maxAttempts) {
      log.warn(`Prisma generate attempt ${attempt}/${maxAttempts} failed — retrying in 3s…`);
      log.hint('If this persists, stop any running `pnpm dev` (it locks the engine DLL on Windows).');
      await sleep(3000);
    }
  }
  log.err('Prisma client generation failed.');
  note('prisma-generate', 'fail');
  return false;
}

// ---------------------------------------------------------------------------
// Build shared packages (db/crypto/types) — required by api, worker & seed
// ---------------------------------------------------------------------------
async function buildSharedPackages() {
  log.step('Build shared packages');
  log.info('Compiling @omnipost/db · @omnipost/crypto · @omnipost/types…');
  const res = await runInherit('pnpm turbo run build --filter=./packages/*');
  if (res.ok) {
    log.ok('Shared packages built');
    note('build-packages', 'ok');
    return true;
  }
  log.warn('Shared package build failed (seed will be skipped).');
  log.hint('Run `pnpm turbo run build --filter=./packages/*` to see the error.');
  note('build-packages', 'warn', 'build failed');
  return false;
}

// ---------------------------------------------------------------------------
// Step 1 — preflight
// ---------------------------------------------------------------------------
function preflight() {
  log.step('Preflight checks');

  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isNaN(major) || major < 20) {
    log.err(`Node ${process.version} detected — OmniPost needs Node 20+.`);
    log.hint('Install Node 20 LTS or newer (https://nodejs.org) and re-run.');
    process.exit(1);
  }
  log.ok(`Node ${process.version}`);

  // pnpm: we were likely invoked through it, but verify so error messages are clear.
  if (commandExists('pnpm')) {
    log.ok('pnpm available');
  } else {
    log.warn('pnpm not found on PATH — run `corepack enable` first.');
    note('pnpm', 'warn', 'not detected');
  }

  // node_modules present? If not, install.
  if (!existsSync(`${ROOT}/node_modules`)) {
    log.info('Dependencies not installed yet — running pnpm install…');
    // best-effort; do it synchronously with streamed output happens later
  }
  note('preflight', 'ok');
}

// ---------------------------------------------------------------------------
// Step 2 — .env + secrets
// ---------------------------------------------------------------------------
function ensureEnv() {
  log.step('Environment file & secrets');

  if (!existsSync(ENV_PATH)) {
    if (!existsSync(ENV_EXAMPLE_PATH)) {
      log.err('.env.example is missing — cannot scaffold .env.');
      note('env', 'fail', '.env.example missing');
      process.exit(1);
    }
    try {
      copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
      log.ok('Created .env from .env.example');
    } catch (err) {
      log.err(`Could not write .env: ${err.message}`);
      note('env', 'fail', err.message);
      process.exit(1);
    }
  } else {
    log.ok('.env already exists — preserving your values');
  }

  let lines = readEnvLines();
  if (!lines) {
    // Unreadable but exists — fall back to the example so we don't wedge.
    lines = parseEnv(readFileSync(ENV_EXAMPLE_PATH, 'utf8'));
  }

  const updates = {};

  // Generate strong secrets only when missing / placeholder.
  if (isPlaceholder(getEnvValue(lines, 'OMNIPOST_DATA_KEY'))) {
    updates.OMNIPOST_DATA_KEY = randomBytes(32).toString('base64');
    log.ok('Generated OMNIPOST_DATA_KEY (AES-256 master key, 32 bytes)');
  } else {
    log.ok('OMNIPOST_DATA_KEY already set');
  }

  if (isPlaceholder(getEnvValue(lines, 'JWT_SECRET'))) {
    updates.JWT_SECRET = randomBytes(48).toString('base64');
    log.ok('Generated JWT_SECRET (48 bytes)');
  } else {
    log.ok('JWT_SECRET already set');
  }

  // Demo-friendly defaults: mock mode on unless --production.
  const desiredMock = FLAGS.production ? 'false' : 'true';
  const currentMock = getEnvValue(lines, 'MOCK_MODE');
  if (currentMock !== desiredMock) {
    updates.MOCK_MODE = desiredMock;
    log.ok(`Set MOCK_MODE=${desiredMock}${FLAGS.production ? ' (real OAuth)' : ' (demo, no external creds needed)'}`);
  } else {
    log.ok(`MOCK_MODE=${currentMock}`);
  }

  if (Object.keys(updates).length > 0) {
    try {
      writeEnvLines(applyEnvUpdates(lines, updates));
    } catch (err) {
      log.err(`Failed to update .env: ${err.message}`);
      note('env', 'fail', err.message);
      process.exit(1);
    }
  }
  note('env', 'ok');
}

// ---------------------------------------------------------------------------
// Step 3 — infra (docker compose) with auto-start + health wait
// ---------------------------------------------------------------------------
async function ensureInfra() {
  log.step('Local infrastructure (Postgres · Redis · MinIO)');

  // If everything is already listening, don't touch docker at all.
  if (await allRequiredPortsOpen()) {
    log.ok('Postgres & Redis already reachable — reusing running services');
    note('infra', 'ok', 'pre-existing services');
    return true;
  }

  if (!commandExists('docker')) {
    log.warn('Docker is not installed.');
    log.hint('Install Docker Desktop (https://docker.com) OR point DATABASE_URL / REDIS_URL / S3_* in .env at your own services, then re-run `pnpm setup --skip-infra`.');
    note('infra', 'warn', 'docker not installed');
    return false;
  }

  const dockerReady = await ensureDockerDaemon();
  if (!dockerReady) {
    note('infra', 'warn', 'docker daemon unavailable');
    return false;
  }

  const compose = detectCompose();
  if (!compose) {
    log.err('Neither `docker compose` nor `docker-compose` works.');
    note('infra', 'fail', 'no compose');
    return false;
  }

  if (FLAGS.reset) {
    log.info('--reset: tearing down existing volumes…');
    await runInherit(`${compose} down -v`);
  }

  log.info('Starting containers (docker compose up -d)…');
  const up = await runInherit(`${compose} up -d`);
  if (!up.ok) {
    log.err('docker compose failed to start the stack.');
    log.hint('Check the output above. A common cause is a port already in use (5432/6379/9000).');
    note('infra', 'fail', 'compose up failed');
    return false;
  }

  // Health-wait on each port.
  let allOk = true;
  for (const p of PORTS) {
    const ok = await waitForPort(p.label, p.host, p.port, { timeoutMs: 120_000 });
    if (!ok && p.required) allOk = false;
    if (!ok && !p.required) log.warn(`${p.label} not ready (non-fatal — used for media in dev).`);
  }

  if (!allOk) {
    log.err('Postgres or Redis did not become healthy in time.');
    log.hint('Run `pnpm infra:logs` to inspect, or `pnpm setup --reset` to recreate volumes.');
    note('infra', 'fail', 'health timeout');
    return false;
  }

  log.ok('Infrastructure is up and healthy');
  note('infra', 'ok');
  return true;
}

async function probeExistingInfra() {
  const ok = await allRequiredPortsOpen();
  if (ok) log.ok('Found reachable Postgres & Redis');
  else log.warn('Postgres / Redis not reachable yet — schema & seed will be skipped.');
  return ok;
}

async function allRequiredPortsOpen() {
  for (const p of PORTS) {
    if (p.required && !(await checkPort(p.host, p.port))) return false;
  }
  return true;
}

function detectCompose() {
  if (run('docker compose version').ok) return 'docker compose';
  if (run('docker-compose version').ok) return 'docker-compose';
  return null;
}

/**
 * Make the Docker daemon reachable. If it's down, attempt a best-effort launch
 * of Docker Desktop (Win/Mac) and poll for up to ~120s. Returns true if the
 * daemon ends up reachable.
 */
async function ensureDockerDaemon() {
  if (run('docker info').ok) {
    log.ok('Docker daemon is running');
    return true;
  }

  if (FLAGS.noDockerAutostart) {
    log.warn('Docker daemon not running (--no-docker-autostart set).');
    log.hint('Start Docker, then re-run `pnpm setup`.');
    return false;
  }

  log.info('Docker daemon not running — attempting to start it…');
  const launched = tryLaunchDocker();
  if (!launched) {
    log.warn('Could not auto-launch Docker on this platform.');
    log.hint('Start Docker Desktop manually, then re-run `pnpm setup`.');
    return false;
  }

  // Poll docker info for up to 120s.
  const start = Date.now();
  process.stdout.write(`    ${c.dim('waiting for Docker daemon')} `);
  while (Date.now() - start < 120_000) {
    if (run('docker info').ok) {
      process.stdout.write(` ${c.green('ready')}\n`);
      log.ok('Docker daemon started');
      return true;
    }
    process.stdout.write(c.dim('.'));
    await sleep(2500);
  }
  process.stdout.write(` ${c.red('timeout')}\n`);
  log.warn('Docker did not become ready in 2 minutes.');
  log.hint('Open Docker Desktop, wait for it to finish starting, then re-run `pnpm setup`.');
  return false;
}

function tryLaunchDocker() {
  // All launch commands are bounded so a hung launcher (or a sudo prompt with
  // no tty) can never wedge setup.
  const T = { timeout: 15_000 };
  try {
    if (process.platform === 'win32') {
      const candidates = [
        `${process.env.ProgramFiles}\\Docker\\Docker\\Docker Desktop.exe`,
        `${process.env.LOCALAPPDATA}\\Docker\\Docker Desktop.exe`,
      ];
      for (const exe of candidates) {
        if (exe && existsSync(exe)) {
          run(`powershell -NoProfile -Command "Start-Process '${exe}'"`, T);
          return true;
        }
      }
      // Fallback: try the Start menu app name.
      const r = run('powershell -NoProfile -Command "Start-Process \'Docker Desktop\'"', T);
      return r.ok;
    }
    if (process.platform === 'darwin') {
      return run('open -a Docker', T).ok;
    }
    // Linux: try to start the service without privileges only. We deliberately
    // do NOT invoke sudo (it could block on a password prompt); if the daemon
    // needs root the user will be told to start it themselves.
    return run('systemctl start docker', T).ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Schema sync — committed migrations if present, else db push (with retry)
// ---------------------------------------------------------------------------
async function dbPush() {
  log.step('Database schema');

  const hasMigrations = existsSync(`${ROOT}/packages/db/prisma/migrations`);
  const cmd = hasMigrations
    ? 'pnpm --filter @omnipost/db exec prisma migrate deploy'
    : 'pnpm --filter @omnipost/db exec prisma db push --skip-generate --accept-data-loss';
  log.info(hasMigrations ? 'Applying migrations…' : 'Syncing schema (prisma db push)…');

  // Retry: the DB container may still be finishing its first-boot init.
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await runInherit(cmd);
    if (res.ok) {
      log.ok('Schema is in sync');
      note('schema', 'ok');
      return true;
    }
    if (attempt < maxAttempts) {
      const backoff = attempt * 3000;
      log.warn(`Schema sync attempt ${attempt}/${maxAttempts} failed — retrying in ${backoff / 1000}s…`);
      await sleep(backoff);
    }
  }
  log.err('Could not apply the database schema after several attempts.');
  log.hint('Verify DATABASE_URL in .env and that Postgres is healthy (`pnpm infra:logs`).');
  note('schema', 'fail', 'push failed');
  return false;
}

// ---------------------------------------------------------------------------
// Step 5 — demo seed
// ---------------------------------------------------------------------------
async function seedDemo() {
  log.step('Demo data');
  const res = await runInherit('pnpm --filter @omnipost/api seed:demo');
  if (res.ok) {
    log.ok('Seeded demo account + mock-connected platforms');
    note('seed', 'ok');
    return true;
  }
  log.warn('Demo seeding failed (non-fatal).');
  log.hint('You can retry any time with `pnpm seed:demo`.');
  note('seed', 'warn', 'seed failed');
  return false;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
function summary({ infraUp, schemaOk, seedOk }) {
  log.banner('Setup summary');

  for (const r of results) {
    const icon = r.status === 'ok' ? c.green('✓') : r.status === 'warn' ? c.yellow('⚠') : c.red('✗');
    const detail = r.detail ? c.dim(` — ${r.detail}`) : '';
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  log.blank();

  const ready = infraUp && schemaOk;
  if (ready) {
    console.log(c.green(c.bold('  ✅ OmniPost is ready.')));
    log.blank();
    console.log(`  ${c.bold('Start everything:')}  ${c.cyan('pnpm dev')}`);
    console.log(`  ${c.dim('(api :4000 · worker · web :3000 — all in one terminal)')}`);
    log.blank();
    if (seedOk) {
      console.log(`  ${c.bold('Then sign in at')} ${c.cyan('http://localhost:3000/login')}`);
      console.log(`    ${c.dim('email   ')} demo@omnipost.dev`);
      console.log(`    ${c.dim('password')} correct-horse-battery-staple`);
    } else {
      console.log(`  ${c.dim('Seed a demo account later with')} ${c.cyan('pnpm seed:demo')}`);
    }
  } else {
    console.log(c.yellow(c.bold('  ⚠ Partial setup.')) + ' Secrets + .env are ready; finish the rest:');
    log.blank();
    if (!infraUp) {
      console.log(`  ${c.dim('1.')} Start your database/redis (start Docker, then) ${c.cyan('pnpm setup')}`);
    } else if (!schemaOk) {
      console.log(`  ${c.dim('1.')} ${c.cyan('pnpm db:push')}  ${c.dim('(sync schema once Postgres is reachable)')}`);
      console.log(`  ${c.dim('2.')} ${c.cyan('pnpm seed:demo')}`);
    }
  }
  log.blank();
  console.log(c.dim('  Re-run `pnpm setup` any time — it is idempotent. `pnpm doctor` checks your environment.'));
  log.blank();
}
