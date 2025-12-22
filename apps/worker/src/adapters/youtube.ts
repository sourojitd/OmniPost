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
import { createReadStream, statSync } from 'fs';
import type { Platform } from '@omnipost/db';
import { AdapterError, type AdapterContext, type AdapterResult, type BaseAdapter } from './base';

/**
 * YouTube Data API v3 resumable upload:
 *   1. POST /upload/youtube/v3/videos?uploadType=resumable with metadata JSON,
 *      capture `Location` header (the resumable session URL).
 *   2. PUT the bytes (single shot or chunked) to that URL with Content-Length.
 *   3. Poll/parse the final response which contains { id, snippet, status, ... }.
 *
 * Shorts schema: vertical AR (<1) AND duration <= 60s. We append "#Shorts" to
 * the title/description, which is the documented signal YouTube uses to
 * categorize the upload as a Short.
 */
export class YouTubeAdapter implements BaseAdapter {
  readonly platform: Platform = 'YOUTUBE';

  constructor(private readonly http: AxiosInstance = axios.create()) {}

  async publish(ctx: AdapterContext): Promise<AdapterResult> {
    const isShort = ctx.meta.durationSec <= 60 && ctx.meta.aspectRatio < 1;
    const titleBase = ctx.caption.split('\n')[0].slice(0, 90) || 'Untitled';
    const title = isShort ? `${titleBase} #Shorts` : titleBase;
    const description = isShort ? `${ctx.caption}\n\n#Shorts` : ctx.caption;

    const metadata = {
      snippet: {
        title,
        description,
        // categoryId 22 = "People & Blogs"; safe default.
        categoryId: '22',
      },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
    };

    const fileSize = statSync(ctx.localMediaPath).size;

    let sessionUrl: string;
    try {
      const init = await this.http.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        metadata,
        {
          headers: {
            Authorization: `Bearer ${ctx.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Length': String(fileSize),
            'X-Upload-Content-Type': 'video/*',
          },
          maxRedirects: 0,
          validateStatus: (s) => s >= 200 && s < 300,
        },
      );
      sessionUrl = init.headers['location'];
      if (!sessionUrl) throw new Error('Missing resumable session Location header');
    } catch (err) {
      throw this.toAdapterError('youtube.init_failed', err);
    }

    try {
      const put = await this.http.put(sessionUrl, createReadStream(ctx.localMediaPath), {
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': 'video/*',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const videoId = put.data?.id;
      if (!videoId) {
        throw new AdapterError(
          this.platform,
          'youtube.no_video_id',
          'Upload completed but response had no video id',
          put.data,
          false,
        );
      }
      return {
        remoteId: videoId,
        remoteUrl: isShort
          ? `https://www.youtube.com/shorts/${videoId}`
          : `https://www.youtube.com/watch?v=${videoId}`,
        raw: put.data,
      };
    } catch (err) {
      throw this.toAdapterError('youtube.upload_failed', err);
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
