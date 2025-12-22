/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ApiKeyGuard } from './api-key.guard';

function makeCtx(headers: Record<string, string>) {
  const req: any = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    _req: req,
  } as any;
}

function makePrisma(rows: any[] = []) {
  return {
    apiKey: {
      findUnique: jest.fn(async ({ where }) =>
        rows.find((r) => r.keyPrefix === where.keyPrefix) ?? null,
      ),
      update: jest.fn(async () => ({})),
    },
  } as any;
}

describe('ApiKeyGuard', () => {
  it('returns false when no auth headers present (next guard can try)', async () => {
    const guard = new ApiKeyGuard(makePrisma());
    expect(await guard.canActivate(makeCtx({}))).toBe(false);
  });

  it('rejects malformed keys', async () => {
    const guard = new ApiKeyGuard(makePrisma());
    await expect(
      guard.canActivate(makeCtx({ authorization: 'Bearer op_live_tooshort' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid key, populates req.user and req.apiKey', async () => {
    const fullKey = 'op_live_abcdef0123456789abcdefghij';
    const keyHash = await bcrypt.hash(fullKey, 4);
    const prisma = makePrisma([
      {
        id: 'k1',
        userId: 'u1',
        keyPrefix: fullKey.slice(0, 14),
        keyHash,
        revokedAt: null,
        scopes: ['posts:write'],
        user: { email: 'a@b.com' },
      },
    ]);
    const guard = new ApiKeyGuard(prisma);
    const ctx = makeCtx({ 'x-api-key': fullKey });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(ctx._req.user).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(ctx._req.apiKey).toEqual({ id: 'k1', scopes: ['posts:write'] });
  });

  it('rejects a revoked key', async () => {
    const fullKey = 'op_live_zzzzzz1111111111111111111';
    const keyHash = await bcrypt.hash(fullKey, 4);
    const prisma = makePrisma([
      {
        id: 'k1',
        userId: 'u1',
        keyPrefix: fullKey.slice(0, 14),
        keyHash,
        revokedAt: new Date(),
        scopes: [],
        user: { email: 'a@b.com' },
      },
    ]);
    const guard = new ApiKeyGuard(prisma);
    await expect(
      guard.canActivate(makeCtx({ authorization: `Bearer ${fullKey}` })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a forged key (correct prefix, wrong secret)', async () => {
    const realKey = 'op_live_realreal1111111111111111';
    const forged = 'op_live_realrealOTHERSECRETxxxxx';
    const keyHash = await bcrypt.hash(realKey, 4);
    const prisma = makePrisma([
      {
        id: 'k1',
        userId: 'u1',
        keyPrefix: realKey.slice(0, 14),
        keyHash,
        revokedAt: null,
        scopes: [],
        user: { email: 'a@b.com' },
      },
    ]);
    const guard = new ApiKeyGuard(prisma);
    await expect(
      guard.canActivate(makeCtx({ authorization: `Bearer ${forged}` })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
