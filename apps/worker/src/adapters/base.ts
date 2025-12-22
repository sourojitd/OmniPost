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
import type { MediaMetadata } from '../media/ffprobe';

export interface AdapterContext {
  /** Decrypted OAuth access token for this user+platform. */
  accessToken: string;
  /** Optional refresh token (decrypted). */
  refreshToken?: string | null;
  /** Local path on disk to the (already smart-padded) media file. */
  localMediaPath: string;
  /** Probed metadata of the media. */
  meta: MediaMetadata;
  /** Caption / post text. */
  caption: string;
  /** Platform-side identifiers for the connected account, free-form. */
  platformMeta: Record<string, unknown> | null;
}

export interface AdapterResult {
  remoteId: string;
  remoteUrl?: string;
  raw?: unknown;
}

/**
 * Platform-specific errors so the worker can decide whether to retry,
 * rate-limit, or dead-letter the job.
 */
export class AdapterError extends Error {
  constructor(
    public readonly platform: Platform,
    public readonly code: string,
    message: string,
    /** Full upstream response body for debugging. Logged verbatim. */
    public readonly body?: unknown,
    /** Indicates whether retrying the same payload could succeed. */
    public readonly retryable: boolean = false,
    /** Suggested minimum wait before retry (ms). Used by the backoff layer. */
    public readonly retryAfterMs?: number,
    /**
     * Indicates the failure was due to an invalid/expired access token. The
     * worker will attempt a refresh-token grant before requeueing. Distinct
     * from generic `retryable` because a refresh failure must NOT loop.
     */
    public readonly isAuthError: boolean = false,
  ) {
    super(`[${platform}] ${code}: ${message}`);
    this.name = 'AdapterError';
  }
}

export interface BaseAdapter {
  readonly platform: Platform;
  publish(ctx: AdapterContext): Promise<AdapterResult>;
}
