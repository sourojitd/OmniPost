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
 * Exponential backoff with full jitter (AWS Architecture Blog formula).
 *
 *   delay = random_between(0, min(cap, base * 2^attempt))
 *
 * Full jitter empirically converges faster than equal/decorrelated jitter
 * when multiple workers contend on the same upstream rate limit.
 */
export interface BackoffOptions {
  baseMs?: number;
  capMs?: number;
  /** Hard cap on attempts; after this the job goes to DEAD_LETTER. */
  maxAttempts?: number;
}

const DEFAULTS = {
  baseMs: 5_000, // 5s
  capMs: 60 * 60_000, // 1h
  maxAttempts: 8,
};

export function nextDelayMs(attempt: number, opts: BackoffOptions = {}): number {
  const { baseMs, capMs } = { ...DEFAULTS, ...opts };
  const exp = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.floor(Math.random() * exp);
}

export interface BackoffDecision {
  shouldRetry: boolean;
  nextRetryAt?: Date;
}

export function decideRetry(
  attempt: number,
  retryable: boolean,
  hint: number | undefined,
  opts: BackoffOptions = {},
): BackoffDecision {
  const { maxAttempts } = { ...DEFAULTS, ...opts };
  if (!retryable) return { shouldRetry: false };
  if (attempt >= maxAttempts) return { shouldRetry: false };
  const delay = hint && hint > 0 ? hint : nextDelayMs(attempt, opts);
  return { shouldRetry: true, nextRetryAt: new Date(Date.now() + delay) };
}
