/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import * as bcrypt from 'bcryptjs';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  function makePrismaMock() {
    const store: any[] = [];
    return {
      _store: store,
      apiKey: {
        create: jest.fn(async ({ data, select }) => {
          const row = {
            id: `k_${store.length + 1}`,
            createdAt: new Date(),
            lastUsedAt: null,
            revokedAt: null,
            ...data,
          };
          store.push(row);
          return Object.fromEntries(Object.keys(select).map((k) => [k, (row as any)[k]]));
        }),
        findMany: jest.fn(async ({ where }) =>
          store.filter((r) => r.userId === where.userId),
        ),
        findFirst: jest.fn(async ({ where }) =>
          store.find((r) => r.id === where.id && r.userId === where.userId) ?? null,
        ),
        update: jest.fn(async ({ where, data, select }) => {
          const row = store.find((r) => r.id === where.id);
          if (!row) throw new Error('not found');
          Object.assign(row, data);
          return Object.fromEntries(Object.keys(select).map((k) => [k, (row as any)[k]]));
        }),
      },
    } as any;
  }

  it('creates a key with bcrypt-hashed secret and returns plaintext exactly once', async () => {
    const prisma = makePrismaMock();
    const svc = new ApiKeysService(prisma);
    const result = await svc.create('u1', { scopes: ['posts:write'] });
    expect(result.key).toMatch(/^op_live_/);
    expect(result.keyPrefix).toMatch(/^op_live_/);
    // Stored hash must verify the plaintext key but not equal it.
    const stored = prisma._store[0];
    expect(stored.keyHash).not.toBe(result.key);
    expect(await bcrypt.compare(result.key, stored.keyHash)).toBe(true);
  });

  it('revokes a key by setting revokedAt', async () => {
    const prisma = makePrismaMock();
    const svc = new ApiKeysService(prisma);
    const created = await svc.create('u1', { scopes: [] });
    const revoked = await svc.revoke('u1', created.id);
    expect(revoked.revokedAt).toBeInstanceOf(Date);
  });

  it('refuses to revoke another user\'s key', async () => {
    const prisma = makePrismaMock();
    const svc = new ApiKeysService(prisma);
    const created = await svc.create('u1', { scopes: [] });
    await expect(svc.revoke('u2', created.id)).rejects.toThrow();
  });
});
