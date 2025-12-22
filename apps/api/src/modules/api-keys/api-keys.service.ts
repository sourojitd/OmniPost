/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateApiKeyDto } from '@omnipost/types';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateApiKeyDto) {
    // 32 random bytes encoded url-safe; prefix is 6 chars for UX recognizability.
    const raw = randomBytes(24).toString('base64url');
    const fullKey = `op_live_${raw}`;
    const keyPrefix = fullKey.slice(0, 14); // e.g. op_live_abc123
    const keyHash = await bcrypt.hash(fullKey, 12);

    const record = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        scopes: dto.scopes ?? [],
        keyPrefix,
        keyHash,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        keyPrefix: true,
        createdAt: true,
      },
    });

    // Plaintext key is returned only this once.
    return { ...record, key: fullKey };
  }

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        scopes: true,
        keyPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const existing = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('API key not found');
    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, revokedAt: true },
    });
  }
}
