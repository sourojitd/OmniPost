/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Platform, Prisma } from '@omnipost/db';
import type { CreatePostDto } from '@omnipost/types';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from './queue.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async create(userId: string, dto: CreatePostDto) {
    // Tenancy: a user must only be able to post media they themselves uploaded.
    if (!dto.mediaS3Key.startsWith(`u/${userId}/`)) {
      throw new ForbiddenException('mediaS3Key is outside your namespace');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.post.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: dto.idempotencyKey } },
        include: { deliveryLogs: true },
      });
      if (existing) return existing;
    }

    // Resolve which SocialAccount to use per requested platform.
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        userId,
        platform: { in: dto.targetPlatforms as Platform[] },
        status: 'ACTIVE',
        ...(dto.socialAccountIds ? { id: { in: dto.socialAccountIds } } : {}),
      },
    });

    const byPlatform = new Map<Platform, typeof accounts[number]>();
    for (const a of accounts) if (!byPlatform.has(a.platform)) byPlatform.set(a.platform, a);

    const missing = dto.targetPlatforms.filter((p) => !byPlatform.has(p as Platform));
    if (missing.length) {
      throw new BadRequestException(
        `No ACTIVE social account connected for: ${missing.join(', ')}`,
      );
    }

    let post;
    try {
      post = await this.prisma.post.create({
        data: {
          userId,
          caption: dto.caption,
          mediaS3Key: dto.mediaS3Key,
          mediaMimeType: dto.mediaMimeType,
          targetPlatforms: dto.targetPlatforms as Platform[],
          status: 'QUEUED',
          idempotencyKey: dto.idempotencyKey,
          deliveryLogs: {
            create: dto.targetPlatforms.map((p) => ({
              platform: p as Platform,
              socialAccountId: byPlatform.get(p as Platform)!.id,
              status: 'PENDING' as const,
            })),
          },
        },
        include: { deliveryLogs: true },
      });
    } catch (err) {
      // Race on idempotency-key: another request created the same Post between
      // our findUnique() and our create(). Resolve by re-fetching the winner.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        dto.idempotencyKey
      ) {
        const winner = await this.prisma.post.findUnique({
          where: { userId_idempotencyKey: { userId, idempotencyKey: dto.idempotencyKey } },
          include: { deliveryLogs: true },
        });
        if (winner) return winner;
      }
      throw err;
    }

    // Fan out one job per platform target.
    await Promise.all(
      post.deliveryLogs.map((log) =>
        this.queue.enqueueFanout({
          postId: post.id,
          deliveryLogId: log.id,
          platform: log.platform,
          userId,
        }),
      ),
    );

    return post;
  }

  async findOne(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
      include: { deliveryLogs: true },
    });
    if (!post) throw new NotFoundException();
    return post;
  }

  list(userId: string) {
    return this.prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { deliveryLogs: true },
    });
  }
}
