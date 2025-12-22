/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import { statSync } from 'fs';
import type { Platform } from '@omnipost/db';
import { AdapterError, type AdapterContext, type AdapterResult, type BaseAdapter } from './base';

/**
 * X (Twitter) v2 publishing with the legacy chunked media upload endpoints,
 * which v2 still routes through (upload.twitter.com/1.1/media/upload.json):
 *
 *   1. INIT      command=INIT&total_bytes=N&media_type=video/mp4&media_category=tweet_video
 *      -> { media_id_string }
 *   2. APPEND    command=APPEND&media_id=...&segment_index=k   (multipart, ~5MB chunks)
 *   3. FINALIZE  command=FINALIZE&media_id=...
 *      -> { processing_info?: { state, check_after_secs } }
 *   4. STATUS    command=STATUS&media_id=...  (poll while processing_info.state in pending|in_progress)
 *   5. POST /2/tweets { text, media: { media_ids: [media_id] } }
 *
 * Free-tier rule: video duration must be <= 140s. We enforce client-side.
 */
const APPEND_CHUNK_BYTES = 5 * 1024 * 1024;
const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEETS_URL = 'https://api.twitter.com/2/tweets';

export class XAdapter implements BaseAdapter {
  readonly platform: Platform = 'X';

  constructor(private readonly http: AxiosInstance = axios.create()) {}

  async publish(ctx: AdapterContext): Promise<AdapterResult> {
    if (ctx.meta.durationSec > 140) {
      throw new AdapterError(
        this.platform,
        'x.duration_exceeded',
        `Video duration ${ctx.meta.durationSec}s exceeds X 140s limit`,
        undefined,
        false,
      );
    }

    const size = statSync(ctx.localMediaPath).size;
    const mediaId = await this.init(ctx.accessToken, size);
    await this.append(ctx.accessToken, mediaId, ctx.localMediaPath, size);
    await this.finalizeAndWait(ctx.accessToken, mediaId);
    return this.postTweet(ctx.accessToken, mediaId, ctx.caption);
  }

  private async init(token: string, totalBytes: number): Promise<string> {
    try {
      const r = await this.http.post(
        UPLOAD_URL,
        null,
        {
          params: {
            command: 'INIT',
            total_bytes: totalBytes,
            media_type: 'video/mp4',
            media_category: 'tweet_video',
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const id = r.data?.media_id_string;
      if (!id) throw new AdapterError(this.platform, 'x.no_media_id', 'INIT returned no media_id_string', r.data, false);
      return id;
    } catch (err) {
      throw this.toAdapterError('x.init_failed', err);
    }
  }

  private async append(token: string, mediaId: string, path: string, size: number): Promise<void> {
    const fd = await import('fs');
    const fh = await fd.promises.open(path, 'r');
    try {
      let segmentIndex = 0;
      let offset = 0;
      const buffer = Buffer.alloc(APPEND_CHUNK_BYTES);
      while (offset < size) {
        const { bytesRead } = await fh.read(buffer, 0, APPEND_CHUNK_BYTES, offset);
        if (bytesRead === 0) break;
        const form = new FormData();
        form.append('command', 'APPEND');
        form.append('media_id', mediaId);
        form.append('segment_index', String(segmentIndex));
        form.append('media', buffer.subarray(0, bytesRead), {
          filename: `chunk-${segmentIndex}.bin`,
          contentType: 'application/octet-stream',
        });
        try {
          await this.http.post(UPLOAD_URL, form, {
            headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          });
        } catch (err) {
          throw this.toAdapterError(`x.append_failed.segment_${segmentIndex}`, err);
        }
        offset += bytesRead;
        segmentIndex += 1;
      }
    } finally {
      await fh.close();
    }
  }

  private async finalizeAndWait(token: string, mediaId: string): Promise<void> {
    let resp;
    try {
      resp = await this.http.post(UPLOAD_URL, null, {
        params: { command: 'FINALIZE', media_id: mediaId },
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      throw this.toAdapterError('x.finalize_failed', err);
    }
    let processing = resp.data?.processing_info;
    while (processing && (processing.state === 'pending' || processing.state === 'in_progress')) {
      await new Promise((r) => setTimeout(r, Math.max(1000, (processing.check_after_secs ?? 1) * 1000)));
      try {
        const status = await this.http.get(UPLOAD_URL, {
          params: { command: 'STATUS', media_id: mediaId },
          headers: { Authorization: `Bearer ${token}` },
        });
        processing = status.data?.processing_info;
      } catch (err) {
        throw this.toAdapterError('x.status_failed', err);
      }
    }
    if (processing?.state === 'failed') {
      throw new AdapterError(
        this.platform,
        'x.processing_failed',
        processing.error?.message ?? 'X reported processing failure',
        processing,
        false,
      );
    }
  }

  private async postTweet(token: string, mediaId: string, caption: string): Promise<AdapterResult> {
    try {
      const r = await this.http.post(
        TWEETS_URL,
        { text: caption.slice(0, 280), media: { media_ids: [mediaId] } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      const id = r.data?.data?.id;
      return {
        remoteId: id,
        remoteUrl: id ? `https://x.com/i/status/${id}` : undefined,
        raw: r.data,
      };
    } catch (err) {
      throw this.toAdapterError('x.tweet_failed', err);
    }
  }

  private toAdapterError(code: string, err: unknown): AdapterError {
    if (err instanceof AdapterError) return err;
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const isAuth = status === 401;
      const retryable = isAuth || status === 429 || (status !== undefined && status >= 500);
      const retryAfter = Number(err.response?.headers?.['retry-after']);
      return new AdapterError(
        this.platform,
        code,
        err.message,
        err.response?.data,
        retryable,
        Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
        isAuth,
      );
    }
    return new AdapterError(
      this.platform,
      code,
      err instanceof Error ? err.message : String(err),
      undefined,
      false,
    );
  }
}
