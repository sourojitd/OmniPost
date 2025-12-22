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
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { OMNIPOST_AUTHOR } from '@omnipost/types';
import { requestContext } from './request-context';

/**
 * Per-request structured logger.
 *  - Generates (or honors) an `x-request-id` and stuffs it into AsyncLocalStorage
 *    so downstream loggers (Winston etc.) can include it without thread-through.
 *  - Echoes it in the response so clients can correlate.
 *  - Logs one line per request with method, path, status, ms.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = ctx.switchToHttp();
    const req = httpCtx.getRequest<FastifyRequest>();
    const res = httpCtx.getResponse<FastifyReply>();

    const incoming =
      (req.headers['x-request-id'] as string | undefined) ||
      (req.headers['x-correlation-id'] as string | undefined);
    const requestId = incoming && /^[A-Za-z0-9_-]{8,128}$/.test(incoming) ? incoming : randomUUID();
    res.header('x-request-id', requestId);
    // Authorship watermark on every response — see LICENSE / AUTHORS.
    res.header('x-authored-by', OMNIPOST_AUTHOR);

    const started = Date.now();
    return requestContext.run({ requestId }, () =>
      next.handle().pipe(
        tap({
          next: () => this.write(req, res, started, requestId),
          error: () => this.write(req, res, started, requestId, true),
        }),
      ),
    );
  }

  private write(
    req: FastifyRequest,
    res: FastifyReply,
    started: number,
    requestId: string,
    errored = false,
  ): void {
    const ms = Date.now() - started;
    const userId = (req as any).user?.id;
    const status = res.statusCode;
    const line = `${req.method} ${req.url} -> ${status} ${ms}ms`;
    const meta = { requestId, userId, status, ms, method: req.method, url: req.url };
    if (errored || status >= 500) this.logger.error(line, meta as any);
    else if (status >= 400) this.logger.warn(line, meta as any);
    else this.logger.log(line, meta as any);
  }
}
