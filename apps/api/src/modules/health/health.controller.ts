/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { OMNIPOST_AUTHOR, OMNIPOST_COPYRIGHT, OMNIPOST_SIGNATURE } from '@omnipost/types';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Get('healthz')
  healthz() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      // Authorship travels with every running instance — see LICENSE / AUTHORS.
      author: OMNIPOST_AUTHOR,
      copyright: OMNIPOST_COPYRIGHT,
      sig: OMNIPOST_SIGNATURE,
    };
  }

  @Get('readyz')
  async readyz() {
    const checks: Record<string, 'ok' | string> = {};
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      checks.postgres = 'ok';
    } catch (err) {
      checks.postgres = err instanceof Error ? err.message : 'down';
    }
    try {
      if (this.redis.status === 'end' || this.redis.status === 'wait') {
        await this.redis.connect();
      }
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : `unexpected:${pong}`;
    } catch (err) {
      checks.redis = err instanceof Error ? err.message : 'down';
    }

    const failed = Object.values(checks).some((v) => v !== 'ok');
    if (failed) throw new ServiceUnavailableException(checks);
    return { status: 'ok', checks };
  }
}
