/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Inject, Injectable } from '@nestjs/common';
import { Platform, SocialAccountStatus } from '@omnipost/db';
import type { TokenCrypto } from '@omnipost/crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TOKEN_CRYPTO } from '../crypto/crypto.module';

export interface UpsertAccountInput {
  userId: string;
  platform: Platform;
  platformAccountId: string;
  handle?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  meta?: Record<string, unknown> | null;
}

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TOKEN_CRYPTO) private readonly crypto: TokenCrypto,
  ) {}

  /**
   * Insert or refresh a SocialAccount, transparently encrypting access/refresh tokens.
   */
  async upsert(input: UpsertAccountInput) {
    const accessTokenEnc = this.crypto.encrypt(input.accessToken);
    const refreshTokenEnc = input.refreshToken
      ? this.crypto.encrypt(input.refreshToken)
      : null;

    return this.prisma.socialAccount.upsert({
      where: {
        userId_platform_platformAccountId: {
          userId: input.userId,
          platform: input.platform,
          platformAccountId: input.platformAccountId,
        },
      },
      create: {
        userId: input.userId,
        platform: input.platform,
        platformAccountId: input.platformAccountId,
        handle: input.handle ?? null,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        scopes: input.scopes ?? [],
        meta: (input.meta as any) ?? undefined,
        status: SocialAccountStatus.ACTIVE,
      },
      update: {
        handle: input.handle ?? undefined,
        accessTokenEnc,
        refreshTokenEnc: refreshTokenEnc ?? undefined,
        tokenExpiresAt: input.tokenExpiresAt ?? undefined,
        scopes: input.scopes ?? undefined,
        meta: (input.meta as any) ?? undefined,
        status: SocialAccountStatus.ACTIVE,
      },
    });
  }

  /** Return the decrypted access token for a given account (server-only). */
  async getDecryptedAccessToken(socialAccountId: string): Promise<string> {
    const acc = await this.prisma.socialAccount.findUniqueOrThrow({
      where: { id: socialAccountId },
      select: { accessTokenEnc: true },
    });
    return this.crypto.decrypt(acc.accessTokenEnc);
  }

  /** Public-safe listing — never includes ciphertext or decrypted tokens. */
  list(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        handle: true,
        platformAccountId: true,
        scopes: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async disconnect(userId: string, id: string) {
    return this.prisma.socialAccount.updateMany({
      where: { id, userId },
      data: { status: SocialAccountStatus.REVOKED },
    });
  }
}
