/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function makePrisma() {
  const users: any[] = [];
  return {
    _users: users,
    user: {
      findUnique: jest.fn(async ({ where }) =>
        users.find((u) => u.email === where.email || u.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data, select }) => {
        const u = { id: `u_${users.length + 1}`, createdAt: new Date(), ...data };
        users.push(u);
        return select
          ? Object.fromEntries(Object.keys(select).map((k) => [k, (u as any)[k]]))
          : u;
      }),
    },
  } as any;
}

function makeJwt() {
  return { sign: jest.fn((payload: any) => `jwt:${payload.sub}`) } as any;
}

describe('AuthService', () => {
  it('registers a user, bcrypt-hashes the password, returns JWT', async () => {
    const prisma = makePrisma();
    const svc = new AuthService(prisma, makeJwt());
    const out = await svc.register('alice@example.com', 'correct-horse-battery');
    expect(out.user.email).toBe('alice@example.com');
    expect(out.accessToken).toMatch(/^jwt:/);
    // Stored password is not the plaintext.
    const stored = prisma._users[0];
    expect(stored.passwordHash).toBeDefined();
    expect(stored.passwordHash).not.toBe('correct-horse-battery');
  });

  it('rejects duplicate registration with ConflictException', async () => {
    const prisma = makePrisma();
    const svc = new AuthService(prisma, makeJwt());
    await svc.register('a@b.com', 'correct-horse-battery');
    await expect(svc.register('a@b.com', 'another-password')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('login returns JWT on correct password', async () => {
    const prisma = makePrisma();
    const svc = new AuthService(prisma, makeJwt());
    await svc.register('a@b.com', 'correct-horse-battery');
    const out = await svc.login('a@b.com', 'correct-horse-battery');
    expect(out.accessToken).toMatch(/^jwt:/);
  });

  it('login throws Unauthorized on bad password (no leak in message)', async () => {
    const prisma = makePrisma();
    const svc = new AuthService(prisma, makeJwt());
    await svc.register('a@b.com', 'correct-horse-battery');
    const err = await svc.login('a@b.com', 'wrong-password-here').catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(err.message).toMatch(/Invalid credentials/);
  });

  it('login throws Unauthorized for unknown email with same message (no enumeration)', async () => {
    const prisma = makePrisma();
    const svc = new AuthService(prisma, makeJwt());
    const a = await svc.login('nobody@example.com', 'whatever').catch((e) => e);
    expect(a).toBeInstanceOf(UnauthorizedException);
    expect(a.message).toMatch(/Invalid credentials/);
  });
});
