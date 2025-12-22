/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@omnipost/db';
import { PostsService } from './posts.service';

function makePrisma() {
  const posts: any[] = [];
  const accounts: any[] = [
    {
      id: 'sa_yt',
      userId: 'u1',
      platform: 'YOUTUBE',
      status: 'ACTIVE',
    },
    {
      id: 'sa_ig',
      userId: 'u1',
      platform: 'INSTAGRAM',
      status: 'ACTIVE',
    },
  ];
  return {
    _posts: posts,
    post: {
      findUnique: jest.fn(async ({ where }) =>
        posts.find(
          (p) =>
            p.userId === where.userId_idempotencyKey?.userId &&
            p.idempotencyKey === where.userId_idempotencyKey?.idempotencyKey,
        ) ?? null,
      ),
      create: jest.fn(async ({ data, include: _i }) => {
        // Simulate the unique constraint on (userId, idempotencyKey).
        if (
          data.idempotencyKey &&
          posts.some(
            (p) => p.userId === data.userId && p.idempotencyKey === data.idempotencyKey,
          )
        ) {
          throw new Prisma.PrismaClientKnownRequestError('unique', {
            code: 'P2002',
            clientVersion: 'test',
          } as any);
        }
        const created = {
          id: `p_${posts.length + 1}`,
          createdAt: new Date(),
          ...data,
          deliveryLogs: data.deliveryLogs?.create?.map((d: any, i: number) => ({
            id: `d_${posts.length + 1}_${i}`,
            postId: `p_${posts.length + 1}`,
            ...d,
          })) ?? [],
        };
        posts.push(created);
        return created;
      }),
    },
    socialAccount: {
      findMany: jest.fn(async ({ where }) =>
        accounts.filter(
          (a) => a.userId === where.userId && where.platform.in.includes(a.platform),
        ),
      ),
    },
  } as any;
}

function makeQueue() {
  return { enqueueFanout: jest.fn(async () => ({})) } as any;
}

const validKey = 'u/u1/abc.mp4';

describe('PostsService', () => {
  it('rejects cross-tenant mediaS3Key with ForbiddenException', async () => {
    const svc = new PostsService(makePrisma(), makeQueue());
    await expect(
      svc.create('u1', {
        caption: 'hi',
        mediaS3Key: 'u/u2/somebodyelse.mp4',
        mediaMimeType: 'video/mp4',
        targetPlatforms: ['YOUTUBE'],
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('errors with BadRequest if a requested platform has no ACTIVE account', async () => {
    const svc = new PostsService(makePrisma(), makeQueue());
    await expect(
      svc.create('u1', {
        caption: 'hi',
        mediaS3Key: validKey,
        mediaMimeType: 'video/mp4',
        targetPlatforms: ['X'],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a post with one delivery log per target and enqueues a job each', async () => {
    const prisma = makePrisma();
    const queue = makeQueue();
    const svc = new PostsService(prisma, queue);
    const post = await svc.create('u1', {
      caption: 'multi-target',
      mediaS3Key: validKey,
      mediaMimeType: 'video/mp4',
      targetPlatforms: ['YOUTUBE', 'INSTAGRAM'],
    } as any);
    expect(post.deliveryLogs).toHaveLength(2);
    expect(queue.enqueueFanout).toHaveBeenCalledTimes(2);
  });

  it('resolves idempotency-key races: returns the winning Post on P2002', async () => {
    const prisma = makePrisma();
    const queue = makeQueue();
    const svc = new PostsService(prisma, queue);
    // Pre-seed a winner with the same idempotency key.
    await svc.create('u1', {
      caption: 'first',
      mediaS3Key: validKey,
      mediaMimeType: 'video/mp4',
      targetPlatforms: ['YOUTUBE'],
      idempotencyKey: 'idem-1',
    } as any);
    // The findUnique short-circuits this case; assert the second call returns
    // the existing post and does NOT double-enqueue.
    const second = await svc.create('u1', {
      caption: 'second-with-same-key',
      mediaS3Key: validKey,
      mediaMimeType: 'video/mp4',
      targetPlatforms: ['YOUTUBE'],
      idempotencyKey: 'idem-1',
    } as any);
    expect(second.caption).toBe('first');
    expect(queue.enqueueFanout).toHaveBeenCalledTimes(1);
  });
});
