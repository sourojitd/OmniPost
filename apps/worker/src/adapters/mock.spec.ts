/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { MockAdapter, AdapterError } from './index';
import type { AdapterContext } from './base';
import type { MediaMetadata } from '../media/ffprobe';

function ctx(overrides: Partial<MediaMetadata> = {}): AdapterContext {
  const meta: MediaMetadata = {
    durationSec: 20,
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    hasVideo: true,
    hasAudio: true,
    ...overrides,
  };
  return {
    accessToken: 'mock',
    refreshToken: 'mock',
    localMediaPath: '/dev/null',
    meta,
    caption: 'hello',
    platformMeta: null,
  };
}

describe('MockAdapter', () => {
  // Keep tests fast — override the default latency.
  const orig = { ...process.env };
  beforeEach(() => {
    process.env.MOCK_LATENCY_MS = '0';
    delete process.env.MOCK_FAILURE_RATE;
  });
  afterEach(() => {
    process.env = { ...orig };
  });

  it('YouTube: tags vertical <60s as Shorts', async () => {
    const a = new MockAdapter('YOUTUBE');
    const r = await a.publish(ctx({ durationSec: 30, aspectRatio: 9 / 16 }));
    expect(r.remoteUrl).toMatch(/youtube\.com\/shorts\//);
    expect(r.remoteId).toMatch(/^mock_/);
  });

  it('YouTube: 16:9 longform routes to /watch?v=', async () => {
    const a = new MockAdapter('YOUTUBE');
    const r = await a.publish(ctx({ durationSec: 120, aspectRatio: 16 / 9, width: 1920, height: 1080 }));
    expect(r.remoteUrl).toMatch(/youtube\.com\/watch\?v=/);
  });

  it.each(['INSTAGRAM', 'FACEBOOK', 'X'] as const)('builds a sensible URL for %s', async (p) => {
    const r = await new MockAdapter(p).publish(ctx());
    expect(r.remoteUrl).toMatch(/^https:\/\//);
    expect(r.remoteId).toMatch(/^mock_/);
  });

  it('throws a retryable AdapterError when MOCK_FAILURE_RATE=1', async () => {
    process.env.MOCK_FAILURE_RATE = '1';
    const err = await new MockAdapter('YOUTUBE').publish(ctx()).catch((e) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe('mock.transient_5xx');
  });
});
