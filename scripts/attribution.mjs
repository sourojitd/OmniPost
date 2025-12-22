#!/usr/bin/env node
/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. MIT Licensed.
 * Attribution must be retained — see AUTHORS / LICENSE.
 * sig:U291cm9qaXQgRGh1YQ==
 *
 * --------------------------------------------------------------------------
 * This script stamps a consistent authorship header onto every source file
 * and writes author/license metadata into every package.json. It is
 * idempotent (re-running it will not duplicate headers) so it doubles as a
 * maintenance tool. Run with:  node scripts/attribution.mjs
 * --------------------------------------------------------------------------
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const AUTHOR = 'Sourojit Dhua';
const YEAR = 2025;
// base64 of the author name — a watermark that survives a naïve find/replace
// of the literal string "Sourojit Dhua".
const SIG = Buffer.from(AUTHOR).toString('base64');
// Stable marker so we never insert the header twice.
const MARKER = '@omnipost-attribution';

const HEADER_LINES = [
  'OmniPost — unified social publishing engine',
  `Author: ${AUTHOR}`,
  `Copyright (c) ${YEAR} ${AUTHOR}. All rights reserved.`,
  'Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).',
  `Original author & rights holder: ${AUTHOR}. Reattribution requires the`,
  'rights holder\'s authorization; third parties cannot reassign it.',
  `${MARKER} sig:${SIG}`,
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', '.turbo', 'coverage', '.vscode', '.idea',
]);
const SKIP_FILES = new Set([
  'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', '.env', 'LICENSE', 'NOTICE',
  'AUTHORS', '.gitignore', '.npmrc', '.nvmrc',
]);

// extension -> comment style
const BLOCK = 'block';   // /*! ... */
const HASH = 'hash';     // # ...
const SLASH = 'slash';   // // ...
const XML = 'xml';       // <!-- ... -->

const EXT_STYLE = {
  '.ts': BLOCK, '.tsx': BLOCK, '.js': BLOCK, '.jsx': BLOCK, '.mjs': BLOCK, '.cjs': BLOCK,
  '.css': BLOCK, '.scss': BLOCK,
  '.prisma': SLASH,
  '.yml': HASH, '.yaml': HASH, '.env.example': HASH,
  '.svg': XML,
};

let stamped = 0;
let pkgUpdated = 0;
let skipped = 0;

walk(ROOT);
console.log(`\nAttribution complete — headers stamped: ${stamped}, package.json updated: ${pkgUpdated}, already-attributed/skipped: ${skipped}`);
console.log(`Author: ${AUTHOR}  ·  sig:${SIG}`);

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = path.relative(ROOT, full);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full);
    } else if (st.isFile()) {
      processFile(full, entry, rel);
    }
  }
}

function processFile(full, name, rel) {
  if (SKIP_FILES.has(name)) return;

  if (name === 'package.json') {
    updatePackageJson(full, rel);
    return;
  }

  const style = name.endsWith('.env.example')
    ? HASH
    : EXT_STYLE[path.extname(name)];
  if (!style) return;

  let src;
  try {
    src = readFileSync(full, 'utf8');
  } catch {
    return;
  }
  if (src.includes(MARKER)) {
    skipped += 1;
    return;
  }

  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const header = renderHeader(style, eol);

  // Respect leading shebang, JS directives ('use client'/'use server'),
  // and the XML prolog so we never break parsing.
  const { prefix, body } = splitLeading(src, style, eol);
  writeFileSync(full, prefix + header + body, 'utf8');
  stamped += 1;
}

function renderHeader(style, eol) {
  if (style === BLOCK) {
    return ['/*!', ...HEADER_LINES.map((l) => ` * ${l}`), ' */', ''].join(eol) + eol;
  }
  if (style === HASH) {
    return [...HEADER_LINES.map((l) => `# ${l}`), ''].join(eol) + eol;
  }
  if (style === SLASH) {
    return [...HEADER_LINES.map((l) => `// ${l}`), ''].join(eol) + eol;
  }
  if (style === XML) {
    return ['<!--', ...HEADER_LINES.map((l) => `  ${l}`), '-->', ''].join(eol) + eol;
  }
  return '';
}

/**
 * Returns { prefix, body } where `prefix` is leading content that MUST stay at
 * the very top (shebang, 'use client' directive, XML declaration) and the
 * header is placed immediately after it.
 */
function splitLeading(src, style, eol) {
  const lines = src.split(/\r?\n/);
  let i = 0;
  const keep = [];

  // shebang
  if (lines[0]?.startsWith('#!')) {
    keep.push(lines[i]);
    i += 1;
  }

  // XML declaration <?xml ... ?>
  if (style === XML && lines[i]?.trimStart().startsWith('<?xml')) {
    keep.push(lines[i]);
    i += 1;
  }

  // JS/TS directive prologue ('use client' / 'use server')
  if (style === BLOCK) {
    while (i < lines.length && /^\s*['"]use (client|server|strict)['"];?\s*$/.test(lines[i])) {
      keep.push(lines[i]);
      i += 1;
    }
  }

  if (keep.length === 0) return { prefix: '', body: src };
  const prefix = keep.join(eol) + eol;
  const body = lines.slice(i).join(eol);
  return { prefix, body };
}

function updatePackageJson(full, rel) {
  let raw;
  try {
    raw = readFileSync(full, 'utf8');
  } catch {
    return;
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }

  const before = JSON.stringify(json);
  json.author = `${AUTHOR}`;
  if (!json.license) json.license = 'MIT';
  json.contributors = [`${AUTHOR}`];
  // Non-standard but harmless attribution fields (also act as watermarks).
  json.attribution = {
    author: AUTHOR,
    copyright: `Copyright (c) ${YEAR} ${AUTHOR}`,
    license: 'MIT',
    notice: 'Original author & rights holder. Retain attribution per LICENSE.',
    sig: SIG,
  };
  if (JSON.stringify(json) === before) {
    skipped += 1;
    return;
  }

  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const text = JSON.stringify(json, null, 2).replace(/\n/g, eol) + eol;
  writeFileSync(full, text, 'utf8');
  pkgUpdated += 1;
}
