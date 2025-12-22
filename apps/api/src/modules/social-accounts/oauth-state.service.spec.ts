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
import { createHash } from 'crypto';
import { OAuthStateService } from './oauth-state.service';

function makeService() {
  // In-memory Redis stand-in supporting set/getdel with EX semantics ignored.
  const store = new Map<string, string>();
  const svc = new OAuthStateService({
    getOrThrow: (k: string) => {
      if (k === 'REDIS_URL') return 'redis://stub';
      if (k === 'JWT_SECRET') return 'aaaaaaaaaaaaaaaa-jwt-secret';
      throw new Error(`unknown key ${k}`);
    },
  } as any);
  // Replace the redis member with our in-memory stub.
  (svc as any).redis = {
    set: async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    },
    getdel: async (k: string) => {
      const v = store.get(k);
      store.delete(k);
      return v ?? null;
    },
    quit: async () => undefined,
  };
  (svc as any).hmacKey = createHash('sha256')
    .update('aaaaaaaaaaaaaaaa-jwt-secret')
    .update('omnipost.oauth.state.v1')
    .digest();
  return { svc, store };
}

describe('OAuthStateService', () => {
  it('round-trips a state token: issue → consume → payload', async () => {
    const { svc } = makeService();
    const state = await svc.issue({ userId: 'u1', provider: 'youtube' });
    expect(state).toMatch(/^[^.]+\.[^.]+$/); // nonce.sig
    const payload = await svc.consume(state);
    expect(payload).toEqual({ userId: 'u1', provider: 'youtube' });
  });

  it('refuses to consume a state token twice (single-use)', async () => {
    const { svc } = makeService();
    const state = await svc.issue({ userId: 'u1', provider: 'meta' });
    await svc.consume(state);
    await expect(svc.consume(state)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a tampered signature', async () => {
    const { svc } = makeService();
    const state = await svc.issue({ userId: 'u1', provider: 'x' });
    const [nonce] = state.split('.');
    const tampered = `${nonce}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    await expect(svc.consume(tampered)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed tokens (no dot, empty)', async () => {
    const { svc } = makeService();
    await expect(svc.consume('not-a-token')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(svc.consume('')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('createPkce produces an S256-compatible challenge', () => {
    const { verifier, challenge } = OAuthStateService.createPkce();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    const recomputed = createHash('sha256').update(verifier).digest('base64url');
    expect(challenge).toBe(recomputed);
  });
});
