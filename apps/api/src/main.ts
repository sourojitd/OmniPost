/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import 'reflect-metadata';

// JSON cannot serialize BigInt by default and Fastify will throw on any
// response containing one (e.g. Post.mediaSizeBytes). Serialize BigInt as a
// string globally so API responses never crash on it.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { buildLoggerOptions } from './common/logger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
    {
      logger: WinstonModule.createLogger(buildLoggerOptions()),
      // Do not buffer — if init blows up before the logger is wired we still
      // want the error visible on stderr / in our log transport.
      bufferLogs: false,
    },
  );

  await app.register(helmet, { contentSecurityPolicy: false });

  const allowedOrigins =
    process.env.WEB_ORIGIN?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  await app.register(cors, {
    credentials: true,
    // Default-deny: only echo origins the operator explicitly listed in env.
    // Dev unsets WEB_ORIGIN and we permit localhost variants automatically.
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / health
      if (allowedOrigins.length > 0) {
        return cb(null, allowedOrigins.includes(origin));
      }
      const devOk = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      return cb(null, devOk);
    },
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('v1', { exclude: ['healthz', 'readyz'] });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
   
  console.log(`[omnipost-api] listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
   
  console.error('[omnipost-api] failed to bootstrap', err);
  process.exit(1);
});
