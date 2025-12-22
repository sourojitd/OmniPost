/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { config as loadEnv } from 'dotenv';
import * as path from 'path';
// Load env from the worker dir first (if present) then fall back to the
// workspace root .env, so `turbo run dev` (cwd=apps/worker) still finds it.
loadEnv();
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createTokenCrypto } from '@omnipost/crypto';
import { logger } from './logger';
import { makeS3 } from './s3';
import { makeProcessor } from './processor';
import { startDlqScanner } from './dlq-scanner';

const QUEUE_NAME = 'omnipost.post-fanout';

async function main(): Promise<void> {
  const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const queue = new Queue(QUEUE_NAME, { connection });
  const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);

  const deps = { s3: makeS3(), crypto: createTokenCrypto() };
  const processor = makeProcessor(deps);

  const worker = new Worker(QUEUE_NAME, processor, { connection, concurrency });
  worker.on('completed', (job) => logger.info('job completed', { jobId: job.id }));
  worker.on('failed', (job, err) =>
    logger.warn('job failed (will be requeued by DLQ scanner if eligible)', {
      jobId: job?.id,
      err: err?.message,
    }),
  );

  const scanner = startDlqScanner(queue);

  logger.info('omnipost worker started', { concurrency, queue: QUEUE_NAME });

  const shutdown = async () => {
    logger.info('shutting down worker');
    scanner.stop();
    await worker.close();
    await queue.close();
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('worker bootstrap failed', { err: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
