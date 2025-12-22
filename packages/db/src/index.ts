/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';

import { PrismaClient } from '@prisma/client';

/**
 * Process-wide singleton Prisma client. Prevents connection storms during
 * dev hot-reload and test runs.
 */
declare global {
   
  var __omnipost_prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__omnipost_prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__omnipost_prisma = prisma;
}
