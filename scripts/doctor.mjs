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
 * `pnpm doctor` — read-only environment diagnostics.
 *
 * Tells you, at a glance, whether your machine can run OmniPost and what's
 * currently up. Never mutates anything. Exit code reflects whether the core
 * (env + Postgres + Redis) looks ready.
 */
import { existsSync } from 'node:fs';
import {
  ROOT,
  ENV_PATH,
  c,
  log,
  run,
  commandExists,
  checkPort,
  readEnvLines,
  getEnvValue,
  isPlaceholder,
} from './lib.mjs';

const rows = [];
const add = (name, ok, detail) => rows.push({ name, ok, detail });

async function main() {
  log.banner('OmniPost · doctor', 'environment diagnostics');

  // Runtime
  const major = Number(process.versions.node.split('.')[0]);
  add('Node ≥ 20', major >= 20, process.version);
  add('pnpm on PATH', commandExists('pnpm'), commandExists('pnpm') ? '' : 'run `corepack enable`');
  add('node_modules installed', existsSync(`${ROOT}/node_modules`), existsSync(`${ROOT}/node_modules`) ? '' : 'run `pnpm install`');

  // Docker
  const hasDocker = commandExists('docker');
  add('Docker installed', hasDocker, hasDocker ? '' : 'optional if you BYO services');
  const dockerUp = hasDocker && run('docker info').ok;
  add('Docker daemon running', dockerUp, hasDocker && !dockerUp ? 'start Docker Desktop' : '');

  // .env + secrets
  const envExists = existsSync(ENV_PATH);
  add('.env present', envExists, envExists ? '' : 'run `pnpm setup`');
  const lines = readEnvLines();
  if (lines) {
    add('OMNIPOST_DATA_KEY set', !isPlaceholder(getEnvValue(lines, 'OMNIPOST_DATA_KEY')), '');
    add('JWT_SECRET set', !isPlaceholder(getEnvValue(lines, 'JWT_SECRET')), '');
    const mock = getEnvValue(lines, 'MOCK_MODE');
    add('MOCK_MODE', mock === 'true' || mock === 'false', mock ?? 'unset');
  }

  // Services
  const pg = await checkPort('127.0.0.1', 5433);
  const redis = await checkPort('127.0.0.1', 6380);
  const minio = await checkPort('127.0.0.1', 9100);
  add('Postgres :5433', pg, pg ? '' : 'not reachable');
  add('Redis :6380', redis, redis ? '' : 'not reachable');
  add('MinIO :9100', minio, minio ? '' : 'optional (media in dev)');

  // App ports (informational — free is "ok")
  const api = await checkPort('127.0.0.1', 4000);
  const web = await checkPort('127.0.0.1', 3000);
  add('API :4000', true, api ? 'running' : 'free');
  add('Web :3000', true, web ? 'running' : 'free');

  // Print
  const width = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    const icon = r.ok ? c.green('✓') : c.red('✗');
    const detail = r.detail ? c.dim(` ${r.detail}`) : '';
    console.log(`  ${icon}  ${r.name.padEnd(width)}${detail}`);
  }
  log.blank();

  const coreReady =
    major >= 20 &&
    envExists &&
    !isPlaceholder(getEnvValue(lines ?? [], 'OMNIPOST_DATA_KEY')) &&
    pg &&
    redis;

  if (coreReady) {
    console.log(c.green(c.bold('  ✅ Core looks healthy — `pnpm dev` should just work.')));
  } else {
    console.log(c.yellow(c.bold('  ⚠ Not fully ready — run `pnpm setup` to fix the ✗ rows above.')));
  }
  log.blank();
  process.exit(coreReady ? 0 : 1);
}

main().catch((err) => {
  log.err(`doctor crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
