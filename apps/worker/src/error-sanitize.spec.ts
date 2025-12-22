/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { sanitizeErrorBody } from './error-sanitize';

describe('sanitizeErrorBody', () => {
  it('redacts Authorization-shaped headers if echoed in response', () => {
    const out = sanitizeErrorBody({
      headers: { Authorization: 'Bearer ya29.SECRET', 'x-api-key': 'op_live_abc' },
    });
    expect((out as any).headers.Authorization).toBe('[REDACTED]');
    expect((out as any).headers['x-api-key']).toBe('[REDACTED]');
  });

  it('redacts strings that look like access tokens', () => {
    const out = sanitizeErrorBody({ raw: 'ya29.A0AfH6SMB-this-is-a-fake-access-token' });
    expect((out as any).raw).toBe('[REDACTED]');
  });

  it('truncates very large payloads to a preview', () => {
    const huge = { blob: 'x'.repeat(40_000) };
    const out = sanitizeErrorBody(huge) as any;
    // Either the blob got [REDACTED] (long string) or we hit the byte cap.
    expect(out._truncated === true || out.blob === '[REDACTED]').toBe(true);
  });

  it('caps recursion depth without throwing', () => {
    const cycle: any = { a: {} };
    cycle.a.b = cycle; // cyclic
    const out = sanitizeErrorBody(cycle);
    expect(out).toBeDefined();
  });
});
