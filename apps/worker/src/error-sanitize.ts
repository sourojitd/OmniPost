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
 * Trim and redact upstream error bodies before stuffing them into Postgres.
 * Goals:
 *  - cap byte size (Postgres jsonb is limited; 16KiB is plenty for debugging),
 *  - strip strings that look like access/refresh tokens,
 *  - drop `Authorization`-shaped headers if echoed,
 *  - degrade non-serializable inputs to a safe string.
 */

const MAX_JSON_BYTES = 16 * 1024;
const TOKENISH = /^(ya29\.|EAAB|AAAA|sl_|1\/|op_live_)/;
const SAFE_KEYS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[truncated]';
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && (TOKENISH.test(value) || value.length > 2048)) {
      return '[REDACTED]';
    }
    return value;
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SAFE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrub(v, depth + 1);
    }
  }
  return out;
}

export function sanitizeErrorBody(body: unknown): unknown {
  try {
    const scrubbed = scrub(body);
    const json = JSON.stringify(scrubbed);
    if (Buffer.byteLength(json) <= MAX_JSON_BYTES) return scrubbed;
    return { _truncated: true, preview: json.slice(0, MAX_JSON_BYTES) };
  } catch {
    return { _serializeError: true, message: String(body).slice(0, 2048) };
  }
}
