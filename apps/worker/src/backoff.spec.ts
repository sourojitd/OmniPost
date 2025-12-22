/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { decideRetry, nextDelayMs } from './backoff';

describe('backoff', () => {
  it('respects upstream Retry-After hint over jitter', () => {
    const d = decideRetry(0, true, 7000);
    expect(d.shouldRetry).toBe(true);
    const eta = d.nextRetryAt!.getTime() - Date.now();
    expect(eta).toBeGreaterThanOrEqual(6500);
    expect(eta).toBeLessThanOrEqual(7500);
  });

  it('refuses to retry non-retryable errors', () => {
    expect(decideRetry(0, false, undefined).shouldRetry).toBe(false);
  });

  it('dead-letters after maxAttempts', () => {
    expect(decideRetry(8, true, undefined).shouldRetry).toBe(false);
  });

  it('exponential cap is honored', () => {
    // base 5s, cap 60s -> max ever returned is cap
    for (let i = 0; i < 50; i++) {
      const d = nextDelayMs(20, { baseMs: 5_000, capMs: 60_000 });
      expect(d).toBeLessThanOrEqual(60_000);
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });
});
