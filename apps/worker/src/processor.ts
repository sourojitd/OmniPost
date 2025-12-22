/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Job } from 'bullmq';
import type { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  prisma,
  DeliveryStatus,
  PostStatus,
  Prisma,
  SocialAccountStatus,
  type Platform,
} from '@omnipost/db';
import type { TokenCrypto } from '@omnipost/crypto';
import { logger } from './logger';
import { downloadToFile, uploadFromFile } from './s3';
import { probe } from './media/ffprobe';
import { decideShape, smartPad } from './media/smart-pad';
import { decideRetry } from './backoff';
import { AdapterError, makeAdapter, type BaseAdapter } from './adapters';
import type { AdapterContext } from './adapters/base';
import { refreshAccessToken } from './oauth-refresh';
import { sanitizeErrorBody } from './error-sanitize';

export interface FanoutJobData {
  postId: string;
  deliveryLogId: string;
  platform: Platform;
  userId: string;
}

export interface ProcessorDeps {
  s3: S3Client;
  crypto: TokenCrypto;
}

export function makeProcessor(deps: ProcessorDeps) {
  return async function runJob(job: Job<FanoutJobData>): Promise<void> {
    const { postId, deliveryLogId, platform } = job.data;
    const log = logger.child({ jobId: job.id, postId, platform, deliveryLogId });

    const delivery = await prisma.postPlatformDeliveryLog.findUniqueOrThrow({
      where: { id: deliveryLogId },
      include: { post: true, socialAccount: true },
    });
    await prisma.postPlatformDeliveryLog.update({
      where: { id: deliveryLogId },
      data: { status: DeliveryStatus.UPLOADING, attemptCount: { increment: 1 } },
    });

    const workDir = await mkdtemp(join(tmpdir(), 'omnipost-job-'));
    const srcPath = join(workDir, 'source.bin');
    const outPath = join(workDir, 'padded.mp4');
    try {
      if (!delivery.post.mediaS3Key) throw new Error('Post has no mediaS3Key');

      log.info('downloading media from S3');
      await downloadToFile(deps.s3, delivery.post.mediaS3Key, srcPath);

      const meta = await probe(srcPath);

      // Persist probed media metadata onto the Post (best-effort, idempotent
      // across the per-platform jobs) so the dashboard/API can surface it.
      try {
        const sizeBytes = (await stat(srcPath)).size;
        await prisma.post.update({
          where: { id: postId },
          data: {
            mediaDurationSec: meta.durationSec,
            mediaWidth: meta.width,
            mediaHeight: meta.height,
            mediaSizeBytes: BigInt(sizeBytes),
          },
        });
      } catch (metaErr) {
        log.warn('failed to persist media metadata (non-fatal)', {
          err: metaErr instanceof Error ? metaErr.message : String(metaErr),
        });
      }
      const shape = decideShape(meta, platform);
      let mediaPath = srcPath;
      let transformedKey: string | null = null;
      if (shape.needsTransform) {
        log.info('applying smart-pad transform', { shape });
        await smartPad(srcPath, outPath, shape);
        mediaPath = outPath;
      }

      const mediaUrlResolver = async (): Promise<string> => {
        const sourceKey = delivery.post.mediaS3Key!;
        const key = shape.needsTransform
          ? sourceKey.replace(/^u\//, 'transformed/u/') + '.mp4'
          : sourceKey;
        if (shape.needsTransform && !transformedKey) {
          await uploadFromFile(deps.s3, key, mediaPath, 'video/mp4');
          transformedKey = key;
        }
        return getSignedUrl(
          deps.s3,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET ?? 'omnipost-media',
            Key: key,
          }),
          { expiresIn: 3600 },
        );
      };

      const adapter = makeAdapter(platform, { mediaUrlResolver });
      const platformMeta = (delivery.socialAccount.meta as Record<string, unknown> | null) ?? null;
      const result = await publishWithAuthRefresh({
        adapter,
        platform,
        socialAccountId: delivery.socialAccount.id,
        crypto: deps.crypto,
        ctx: {
          accessToken: deps.crypto.decrypt(delivery.socialAccount.accessTokenEnc),
          refreshToken: delivery.socialAccount.refreshTokenEnc
            ? deps.crypto.decrypt(delivery.socialAccount.refreshTokenEnc)
            : null,
          localMediaPath: mediaPath,
          meta,
          caption: delivery.post.caption,
          platformMeta,
        },
      });

      log.info('platform publish succeeded', { remoteId: result.remoteId });
      await prisma.postPlatformDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: DeliveryStatus.PUBLISHED,
          remoteId: result.remoteId,
          remoteUrl: result.remoteUrl,
          lastErrorCode: null,
          lastErrorBody: Prisma.JsonNull,
        },
      });
      await rollupPostStatus(postId);
    } catch (err) {
      const attempt = (delivery.attemptCount ?? 0) + 1;
      const isAdapter = err instanceof AdapterError;
      const retryable = isAdapter ? err.retryable : false;
      const retryHint = isAdapter ? err.retryAfterMs : undefined;
      const code = isAdapter ? err.code : 'worker.exception';
      const body = sanitizeErrorBody(
        isAdapter ? err.body : { message: err instanceof Error ? err.message : String(err) },
      );

      log.error('platform publish failed', { errCode: code, retryable, attempt });

      const decision = decideRetry(attempt, retryable, retryHint);
      await prisma.postPlatformDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: decision.shouldRetry ? DeliveryStatus.PENDING : DeliveryStatus.DEAD_LETTER,
          nextRetryAt: decision.nextRetryAt ?? null,
          lastErrorCode: code,
          lastErrorBody: body as any,
        },
      });
      await rollupPostStatus(postId);
      // Re-throw so BullMQ marks the job failed; the DLQ scanner will requeue
      // PENDING rows whose nextRetryAt has elapsed.
      throw err;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  };
}

/**
 * Wraps an adapter call so that exactly one 401-class failure triggers a
 * refresh-token grant and a single retry. Refresh failure → mark the
 * SocialAccount EXPIRED and rethrow a non-retryable AdapterError.
 */
async function publishWithAuthRefresh(opts: {
  adapter: BaseAdapter;
  platform: Platform;
  socialAccountId: string;
  crypto: TokenCrypto;
  ctx: AdapterContext;
}) {
  try {
    return await opts.adapter.publish(opts.ctx);
  } catch (err) {
    if (!(err instanceof AdapterError) || !err.isAuthError) throw err;

    if (!opts.ctx.refreshToken) {
      await markAccountExpired(opts.socialAccountId);
      throw err;
    }
    let refreshed;
    try {
      refreshed = await refreshAccessToken(opts.platform, opts.ctx.refreshToken);
    } catch (refreshErr) {
      await markAccountExpired(opts.socialAccountId);
      throw new AdapterError(
        opts.platform,
        'oauth.refresh_failed',
        refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        undefined,
        false,
      );
    }
    await prisma.socialAccount.update({
      where: { id: opts.socialAccountId },
      data: {
        accessTokenEnc: opts.crypto.encrypt(refreshed.accessToken),
        refreshTokenEnc: opts.crypto.encrypt(refreshed.refreshToken),
        tokenExpiresAt: refreshed.expiresAt,
        status: SocialAccountStatus.ACTIVE,
      },
    });
    return opts.adapter.publish({
      ...opts.ctx,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    });
  }
}

async function markAccountExpired(id: string): Promise<void> {
  await prisma.socialAccount
    .update({ where: { id }, data: { status: SocialAccountStatus.EXPIRED } })
    .catch(() => undefined);
}

async function rollupPostStatus(postId: string): Promise<void> {
  const logs = await prisma.postPlatformDeliveryLog.findMany({
    where: { postId },
    select: { status: true },
  });
  const all = logs.length;
  const published = logs.filter((l) => l.status === DeliveryStatus.PUBLISHED).length;
  const dead = logs.filter((l) => l.status === DeliveryStatus.DEAD_LETTER).length;
  const pending = logs.filter(
    (l) => l.status === DeliveryStatus.PENDING || l.status === DeliveryStatus.UPLOADING,
  ).length;

  let status: PostStatus = PostStatus.PROCESSING;
  if (pending === 0 && published === all) status = PostStatus.COMPLETED;
  else if (pending === 0 && published > 0) status = PostStatus.PARTIAL;
  else if (pending === 0 && dead === all) status = PostStatus.FAILED;

  await prisma.post.update({ where: { id: postId }, data: { status } });
}
