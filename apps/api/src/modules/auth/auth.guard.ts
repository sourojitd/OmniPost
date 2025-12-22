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
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiKeyGuard } from './api-key.guard';
import { JwtAuthGuard } from './jwt.guard';

/**
 * Accepts either a session JWT (`Authorization: Bearer eyJ...`) or a
 * programmatic API key (`Authorization: Bearer op_live_...` or
 * `X-API-Key: op_live_...`). The two paths populate `req.user` identically so
 * downstream code is auth-method-agnostic.
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtAuthGuard,
    private readonly apiKey: ApiKeyGuard,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const looksLikeApiKey =
      typeof req.headers['x-api-key'] === 'string' ||
      (typeof req.headers['authorization'] === 'string' &&
        /^Bearer\s+op_live_/i.test(req.headers['authorization'] as string));

    if (looksLikeApiKey) {
      return this.apiKey.canActivate(ctx) as Promise<boolean>;
    }
    try {
      return (await this.jwt.canActivate(ctx)) as boolean;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
