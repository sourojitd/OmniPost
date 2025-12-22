/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import * as winston from 'winston';
import type { WinstonModuleOptions } from 'nest-winston';
import { getRequestId } from './request-context';

const SAFE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'accessTokenEnc',
  'refreshTokenEnc',
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SAFE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v);
  }
  return out;
}

const redactFormat = winston.format((info) => {
  const reqId = getRequestId();
  if (reqId) (info as any).requestId = reqId;
  return redact(info) as winston.Logform.TransformableInfo;
});

export function buildLoggerOptions(): WinstonModuleOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      redactFormat(),
      isProd ? winston.format.json() : winston.format.prettyPrint({ colorize: true }),
    ),
    transports: [new winston.transports.Console()],
  };
}
