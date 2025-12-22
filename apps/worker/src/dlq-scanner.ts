/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import type { Queue } from 'bullmq';
import { prisma, DeliveryStatus, type Platform } from '@omnipost/db';
import { logger } from './logger';

/**
 * Re-enqueue PENDING delivery rows whose nextRetryAt is due.
 *
 * Race-free claim algorithm:
 *  1. Read up to N candidate ids (cheap, no lock).
 *  2. For each id, run an atomic conditional update transitioning
 *     PENDING -> UPLOADING. Only the worker whose update returns count=1 owns
 *     the row and proceeds to enqueue. Losers move on. This is the
 *     conditional-CAS pattern used by Sidekiq / River.
 *
 * No `SELECT ... FOR UPDATE SKIP LOCKED` needed → portable across all
 * Prisma-supported DBs.
 */
const SCAN_INTERVAL_MS = 10_000;

export function startDlqScanner(queue: Queue): { stop: () => void } {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  async function tick(): Promise<void> {
    if (stopped) return;
    try {
      const candidates = await prisma.postPlatformDeliveryLog.findMany({
        where: {
          status: DeliveryStatus.PENDING,
          nextRetryAt: { lte: new Date() },
        },
        take: 200,
        orderBy: { nextRetryAt: 'asc' },
        select: { id: true },
      });

      for (const row of candidates) {
        // Atomic claim: only the row currently still in PENDING is updated.
        // If another scanner already grabbed it, count === 0 and we skip.
        const claim = await prisma.postPlatformDeliveryLog.updateMany({
          where: { id: row.id, status: DeliveryStatus.PENDING },
          data: { status: DeliveryStatus.UPLOADING },
        });
        if (claim.count !== 1) continue;

        const full = await prisma.postPlatformDeliveryLog.findUnique({
          where: { id: row.id },
          select: {
            id: true,
            postId: true,
            platform: true,
            post: { select: { userId: true } },
          },
        });
        if (!full) continue;

        logger.info('dlq scanner enqueuing claimed row', {
          deliveryLogId: full.id,
          platform: full.platform,
        });

        try {
          await queue.add(
            `retry:${full.platform}:${full.id}`,
            {
              postId: full.postId,
              deliveryLogId: full.id,
              platform: full.platform as Platform,
              userId: full.post.userId,
            },
            {
              removeOnComplete: { count: 1000 },
              removeOnFail: { count: 5000 },
              attempts: 1,
            },
          );
        } catch (enqErr) {
          // Roll back the claim if enqueue fails so a future tick can retry.
          await prisma.postPlatformDeliveryLog.update({
            where: { id: full.id },
            data: { status: DeliveryStatus.PENDING },
          });
          logger.error('failed to enqueue claimed row; rolled back', {
            deliveryLogId: full.id,
            err: enqErr instanceof Error ? enqErr.message : String(enqErr),
          });
        }
      }
    } catch (err) {
      logger.error('dlq scanner tick failed', {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      if (!stopped) timer = setTimeout(tick, SCAN_INTERVAL_MS);
    }
  }

  timer = setTimeout(tick, SCAN_INTERVAL_MS);
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
