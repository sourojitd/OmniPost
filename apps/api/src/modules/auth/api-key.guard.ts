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
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authenticates programmatic callers via `Authorization: Bearer op_live_<rand>`
 * or the equivalent `X-API-Key` header. The full key never appears in our
 * database; we store its bcrypt hash plus a short visible prefix that lets us
 * narrow the lookup before doing the (slow) compare.
 *
 * Composed into JwtOrApiKeyGuard so a single endpoint can accept either auth.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  // Visible part = "op_live_" + first 6 chars of the random portion.
  private static readonly PREFIX_LEN = 14;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const raw = this.extract(req);
    if (!raw) return false;

    if (!raw.startsWith('op_live_') || raw.length < ApiKeyGuard.PREFIX_LEN + 4) {
      throw new UnauthorizedException('Malformed API key');
    }

    const keyPrefix = raw.slice(0, ApiKeyGuard.PREFIX_LEN);
    const cand = await this.prisma.apiKey.findUnique({
      where: { keyPrefix },
      select: {
        id: true,
        userId: true,
        keyHash: true,
        scopes: true,
        revokedAt: true,
        user: { select: { email: true } },
      },
    });

    if (!cand || cand.revokedAt) throw new UnauthorizedException('Invalid API key');
    if (!(await bcrypt.compare(raw, cand.keyHash))) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Fire-and-forget lastUsedAt update; never block the request on it.
    this.prisma.apiKey
      .update({ where: { id: cand.id }, data: { lastUsedAt: new Date() } })
      .catch((e) => this.logger.warn(`Failed to bump lastUsedAt: ${e}`));
    (req as any).user = { id: cand.userId, email: cand.user.email };
    (req as any).apiKey = { id: cand.id, scopes: cand.scopes };
    return true;
  }

  private extract(req: FastifyRequest): string | null {
    const xKey = req.headers['x-api-key'];
    if (typeof xKey === 'string' && xKey.length > 0) return xKey;
    const auth = req.headers['authorization'];
    if (typeof auth !== 'string') return null;
    const m = auth.match(/^Bearer\s+(op_live_\S+)$/i);
    return m ? m[1] : null;
  }
}
