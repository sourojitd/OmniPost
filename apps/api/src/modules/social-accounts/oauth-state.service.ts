/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Injectable, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import IORedis, { Redis } from 'ioredis';

/**
 * Per-handshake state stored in Redis (TTL ~10m). Holds:
 *  - userId   : the OmniPost user who initiated the connect flow
 *  - provider : 'youtube' | 'meta' | 'x'
 *  - pkceVerifier? : the random verifier for the matching code_challenge (X)
 *  - returnTo? : URL the dashboard should bounce the user back to
 *
 * The `state` query param transmitted to the IdP is HMAC-signed so that even
 * if an attacker steals the nonce out of Redis they can't mint new ones.
 *
 *   state = `${nonceBase64Url}.${hmacSha256(JWT_SECRET, nonce)Base64Url}`
 */

export interface OAuthStatePayload {
  userId: string;
  provider: 'youtube' | 'meta' | 'x';
  pkceVerifier?: string;
  returnTo?: string;
}

const STATE_TTL_SEC = 10 * 60;
const NONCE_BYTES = 24;

@Injectable()
export class OAuthStateService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;
  private hmacKey!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.redis = new IORedis(this.config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    this.hmacKey = createHash('sha256')
      .update(this.config.getOrThrow<string>('JWT_SECRET'))
      .update('omnipost.oauth.state.v1')
      .digest();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  /** Mint a fresh state+nonce pair and persist the payload. */
  async issue(payload: OAuthStatePayload): Promise<string> {
    const nonce = randomBytes(NONCE_BYTES).toString('base64url');
    await this.redis.set(this.key(nonce), JSON.stringify(payload), 'EX', STATE_TTL_SEC);
    const sig = this.sign(nonce);
    return `${nonce}.${sig}`;
  }

  /** Verify HMAC + look up payload, deleting it (single-use). */
  async consume(state: string): Promise<OAuthStatePayload> {
    const dot = state.indexOf('.');
    if (dot < 0) throw new UnauthorizedException('Malformed OAuth state');
    const nonce = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = this.sign(nonce);
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      throw new UnauthorizedException('OAuth state signature invalid');
    }
    const raw = await this.redis.getdel(this.key(nonce));
    if (!raw) throw new UnauthorizedException('OAuth state expired or already used');
    try {
      return JSON.parse(raw) as OAuthStatePayload;
    } catch {
      throw new UnauthorizedException('OAuth state corrupted');
    }
  }

  /** PKCE: pair a random 64-byte verifier with its SHA-256 base64url challenge. */
  static createPkce(): { verifier: string; challenge: string } {
    const verifier = randomBytes(48).toString('base64url'); // 64 chars
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  private key(nonce: string): string {
    return `omnipost:oauth:state:${nonce}`;
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.hmacKey).update(nonce).digest('base64url');
  }
}
