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
import type { Platform } from '@omnipost/db';
import { AdapterError, type AdapterContext, type AdapterResult, type BaseAdapter } from './base';

/**
 * Meta Graph API publishing flow (Instagram + Facebook Pages):
 *   1. POST /{target}/media   { video_url, caption, media_type: REELS } -> { id: container }
 *   2. Poll  /{container}?fields=status_code  until status_code === 'FINISHED'
 *   3. POST /{target}/media_publish?creation_id={container} -> { id: media_id }
 *   4. GET   /{media_id}?fields=permalink                     -> { permalink }
 *
 * Auth: page access token (stored on SocialAccount.meta.pageAccessToken at
 * connect time) is preferred for both IG Business + FB Page publishing.
 * Token always travels in `Authorization: Bearer …` — never in the query
 * string, which would land it in upstream access logs.
 */
export class MetaAdapter implements BaseAdapter {
  readonly platform: Platform;

  constructor(
    surface: 'INSTAGRAM' | 'FACEBOOK',
    private readonly http: AxiosInstance = axios.create({
      baseURL: 'https://graph.facebook.com/v21.0',
    }),
    private readonly publicMediaUrl: (localPath: string) => Promise<string> = async () => {
      throw new Error('publicMediaUrl resolver not configured');
    },
    private readonly pollOptions: { intervalMs: number; timeoutMs: number } = {
      intervalMs: 4_000,
      timeoutMs: 5 * 60_000,
    },
  ) {
    this.platform = surface;
  }

  async publish(ctx: AdapterContext): Promise<AdapterResult> {
    const igUserId = (ctx.platformMeta?.['igUserId'] as string | undefined) ?? undefined;
    const pageId = (ctx.platformMeta?.['pageId'] as string | undefined) ?? undefined;
    const targetId = this.platform === 'INSTAGRAM' ? igUserId : pageId;
    if (!targetId) {
      throw new AdapterError(
        this.platform,
        'meta.missing_target_id',
        `${this.platform} target id not present on SocialAccount.meta`,
        ctx.platformMeta,
        false,
      );
    }

    // ctx.accessToken is the (decrypted) Page access token recorded at connect
    // time — the credential Meta requires for publishing. A legacy fallback to
    // a token stashed in meta is kept for accounts connected before tokens were
    // moved out of plaintext meta.
    const token =
      (ctx.platformMeta?.['pageAccessToken'] as string | undefined) ?? ctx.accessToken;
    const auth = { Authorization: `Bearer ${token}` };

    const videoUrl = await this.publicMediaUrl(ctx.localMediaPath);
    const isReel = ctx.meta.aspectRatio < 1 && ctx.meta.durationSec <= 90;

    let containerId: string;
    try {
      const create = await this.http.post(
        `/${targetId}/media`,
        null,
        {
          headers: auth,
          params: {
            media_type: isReel ? 'REELS' : 'VIDEO',
            video_url: videoUrl,
            caption: ctx.caption,
            share_to_feed: this.platform === 'INSTAGRAM' ? true : undefined,
          },
        },
      );
      containerId = create.data?.id;
      if (!containerId) {
        throw new AdapterError(
          this.platform,
          'meta.no_container_id',
          'Container creation returned no id',
          create.data,
          false,
        );
      }
    } catch (err) {
      throw this.toAdapterError('meta.container_failed', err);
    }

    // Poll container status until FINISHED.
    const started = Date.now();
    while (true) {
      if (Date.now() - started > this.pollOptions.timeoutMs) {
        throw new AdapterError(
          this.platform,
          'meta.container_timeout',
          `Container ${containerId} did not finish within ${this.pollOptions.timeoutMs}ms`,
          undefined,
          true,
        );
      }
      try {
        const s = await this.http.get(`/${containerId}`, {
          headers: auth,
          params: { fields: 'status_code,status' },
        });
        const code = s.data?.status_code;
        if (code === 'FINISHED') break;
        if (code === 'ERROR' || code === 'EXPIRED') {
          throw new AdapterError(
            this.platform,
            'meta.container_error',
            `Container reported ${code}`,
            s.data,
            false,
          );
        }
      } catch (err) {
        if (err instanceof AdapterError) throw err;
        throw this.toAdapterError('meta.container_poll_failed', err);
      }
      await new Promise((r) => setTimeout(r, this.pollOptions.intervalMs));
    }

    let mediaId: string;
    try {
      const publish = await this.http.post(`/${targetId}/media_publish`, null, {
        headers: auth,
        params: { creation_id: containerId },
      });
      mediaId = publish.data?.id;
      if (!mediaId) {
        throw new AdapterError(
          this.platform,
          'meta.no_media_id',
          'media_publish returned no id',
          publish.data,
          false,
        );
      }
    } catch (err) {
      throw this.toAdapterError('meta.publish_failed', err);
    }

    // Best-effort permalink lookup. IG returns a shortcode-bearing URL we can
    // store; FB pages return a /{pageid}/posts/... URL. If this fails we still
    // succeed — the publish itself is the source of truth.
    let permalink: string | undefined;
    try {
      const perm = await this.http.get(`/${mediaId}`, {
        headers: auth,
        params: { fields: 'permalink_url,permalink' },
      });
      permalink = perm.data?.permalink_url ?? perm.data?.permalink ?? undefined;
    } catch {
      // ignore; remoteId is sufficient for callers to dedupe.
    }

    return { remoteId: mediaId, remoteUrl: permalink, raw: { mediaId, permalink } };
  }

  private toAdapterError(code: string, err: unknown): AdapterError {
    if (err instanceof AdapterError) return err;
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data;
      const fbCode = body?.error?.code ? `fb.${body.error.code}` : code;
      // OAuthException subcodes 463/467 = token expired/invalid -> retryable
      // (worker will refresh-and-retry on 401-class).
      const isExpiredToken =
        status === 401 || body?.error?.code === 190 || body?.error?.code === 463;
      const retryable = isExpiredToken || status === 429 || (status !== undefined && status >= 500);
      return new AdapterError(this.platform, fbCode, err.message, body, retryable, undefined, isExpiredToken);
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
