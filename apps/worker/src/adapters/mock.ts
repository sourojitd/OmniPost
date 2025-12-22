/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import type { Platform } from '@omnipost/db';
import { AdapterError, type AdapterContext, type AdapterResult, type BaseAdapter } from './base';
import { logger } from '../logger';

/**
 * MockAdapter — exercises the full OmniPost pipeline (S3 download, ffprobe,
 * smart-pad, fan-out, DLQ, status rollup, dashboard updates) without ever
 * talking to a real platform. Used in:
 *
 *   - local dev when MOCK_MODE=true (no Google/Meta/X credentials required),
 *   - seeded demo flows so a first-time user can publish in < 60s,
 *   - integration tests that need a deterministic adapter without HTTP mocks.
 *
 * Behavior controls:
 *   MOCK_FAILURE_RATE = 0..1   simulate transient 5xx with this probability,
 *                              letting users see DLQ + backoff actually run.
 *   MOCK_LATENCY_MS   default 800   per-publish sleep (jittered ±50%).
 */
const URL_BUILDERS: Record<Platform, (id: string, isShort: boolean) => string> = {
  YOUTUBE: (id, isShort) =>
    isShort
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
  INSTAGRAM: (id) => `https://www.instagram.com/p/${id}/`,
  FACEBOOK: (id) => `https://www.facebook.com/${id}`,
  X: (id) => `https://x.com/i/status/${id}`,
};

export class MockAdapter implements BaseAdapter {
  constructor(public readonly platform: Platform) {}

  async publish(ctx: AdapterContext): Promise<AdapterResult> {
    const failureRate = Math.max(0, Math.min(1, Number(process.env.MOCK_FAILURE_RATE ?? '0')));
    const baseLatency = Number(process.env.MOCK_LATENCY_MS ?? '800');
    const latency = baseLatency * (0.5 + Math.random());

    // Simulate variable upstream latency so the dashboard's status transitions
    // are visible (PENDING -> UPLOADING -> PUBLISHED).
    await new Promise((r) => setTimeout(r, latency));

    if (failureRate > 0 && Math.random() < failureRate) {
      throw new AdapterError(
        this.platform,
        'mock.transient_5xx',
        'simulated transient upstream failure (MOCK_FAILURE_RATE)',
        { simulated: true, failureRate },
        /* retryable */ true,
        /* retryAfterMs */ 2_000,
      );
    }

    const id = `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const isShort =
      this.platform === 'YOUTUBE' &&
      ctx.meta.durationSec <= 60 &&
      ctx.meta.aspectRatio < 1;
    const remoteUrl = URL_BUILDERS[this.platform](id, isShort);

    logger.info('mock adapter published', {
      platform: this.platform,
      remoteId: id,
      remoteUrl,
      latencyMs: Math.round(latency),
      isShort,
      durationSec: ctx.meta.durationSec,
    });

    return {
      remoteId: id,
      remoteUrl,
      raw: { simulated: true, isShort, durationSec: ctx.meta.durationSec },
    };
  }
}
