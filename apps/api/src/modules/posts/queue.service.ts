/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';

export const POST_QUEUE = 'omnipost.post-fanout';

export interface PostFanoutJob {
  postId: string;
  deliveryLogId: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  userId: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection!: Redis;
  private queue!: Queue;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.connection = new IORedis(this.config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.queue = new Queue(POST_QUEUE, { connection: this.connection });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueueFanout(job: PostFanoutJob) {
    return this.queue.add(`${job.platform}:${job.deliveryLogId}`, job, {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
      attempts: 1, // retries are managed by the worker + DLQ scanner, not BullMQ itself.
    });
  }
}
