/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

/**
 * Demo seeder.
 *
 *   pnpm seed:demo
 *
 * Creates / refreshes a single ready-to-go account so first-time users can
 * log into the dashboard and publish (against the MockAdapter) within seconds:
 *
 *   • User:     demo@omnipost.dev / correct-horse-battery-staple
 *   • API key:  printed once, scoped to posts:write
 *   • Social accounts: a "connected" handle for each platform with
 *                      AES-256-GCM–encrypted mock tokens. The worker, when
 *                      run with MOCK_MODE=true, will accept these blindly.
 *
 * Idempotent: re-run any time to reset the demo's tokens / status.
 */
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { Platform, Prisma, SocialAccountStatus, prisma } from '@omnipost/db';
import { createTokenCrypto, generateMasterKey } from '@omnipost/crypto';

// Load .env from the workspace root (two levels up from apps/api).
loadEnv({ path: path.resolve(__dirname, '../../../../.env') });

const DEMO_EMAIL = 'demo@omnipost.dev';
const DEMO_PASSWORD = 'correct-horse-battery-staple';
// Stable so re-running the seed produces the same key (easier copy/paste).
const DEMO_API_KEY = 'op_live_demo_kEy_AbCdEf0123456789xyz';

interface SeededAccount {
  platform: Platform;
  platformAccountId: string;
  handle: string;
  meta?: Prisma.InputJsonValue;
}

const SEED_ACCOUNTS: SeededAccount[] = [
  {
    platform: Platform.YOUTUBE,
    platformAccountId: 'UC_mock_demo_channel',
    handle: 'Demo Channel',
    meta: { thumbnail: 'https://placehold.co/88x88/7c3aed/fff?text=YT' },
  },
  {
    platform: Platform.INSTAGRAM,
    platformAccountId: '17841400000000001',
    handle: '@demo_ig',
    // No secrets in meta — the (mock) page token is stored encrypted as the
    // account access token, mirroring the real OAuth flow.
    meta: { igUserId: '17841400000000001', pageId: '999000111' },
  },
  {
    platform: Platform.FACEBOOK,
    platformAccountId: '999000111',
    handle: 'Demo Page',
    meta: { pageId: '999000111' },
  },
  {
    platform: Platform.X,
    platformAccountId: 'mock_x_user_id',
    handle: '@demo_x',
  },
];

async function main(): Promise<void> {
  // Safety: the demo account ships with a well-known, publicly-documented API
  // key. Never create it in a production environment unless explicitly forced.
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error(
      [
        '✗ Refusing to seed the demo account while NODE_ENV=production.',
        '',
        '  The demo user has a publicly-known API key and password — seeding it',
        '  in production would create a real, attacker-known account.',
        '',
        '  If you really mean to, re-run with: pnpm seed:demo --force',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (!process.env.OMNIPOST_DATA_KEY) {
    // Help users who haven't initialized .env yet by suggesting a fresh key.
    const fresh = generateMasterKey();
    console.error(
      [
        '✗ OMNIPOST_DATA_KEY is not set.',
        '',
        '  Add this to your .env (workspace root):',
        `    OMNIPOST_DATA_KEY=${fresh}`,
        '',
        '  Then re-run: pnpm seed:demo',
      ].join('\n'),
    );
    process.exit(1);
  }

  const crypto = createTokenCrypto();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1) User (upsert so re-runs are idempotent and refresh the password hash).
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { email: DEMO_EMAIL, passwordHash },
  });

  // 2) Social accounts — fresh mock tokens each run.
  for (const a of SEED_ACCOUNTS) {
    const accessTokenEnc = crypto.encrypt(`mock_access_token_${a.platform}_${Date.now()}`);
    const refreshTokenEnc = crypto.encrypt(`mock_refresh_token_${a.platform}`);
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformAccountId: {
          userId: user.id,
          platform: a.platform,
          platformAccountId: a.platformAccountId,
        },
      },
      update: {
        handle: a.handle,
        accessTokenEnc,
        refreshTokenEnc,
        // 1y in the future so the dashboard shows them as fresh.
        tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scopes: [],
        status: SocialAccountStatus.ACTIVE,
        meta: a.meta ?? undefined,
      },
      create: {
        userId: user.id,
        platform: a.platform,
        platformAccountId: a.platformAccountId,
        handle: a.handle,
        accessTokenEnc,
        refreshTokenEnc,
        tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scopes: [],
        status: SocialAccountStatus.ACTIVE,
        meta: a.meta ?? undefined,
      },
    });
  }

  // 3) API key — predictable so the user can paste it into curl / Postman.
  const keyPrefix = DEMO_API_KEY.slice(0, 14);
  const keyHash = await bcrypt.hash(DEMO_API_KEY, 12);
  await prisma.apiKey.upsert({
    where: { keyPrefix },
    update: { userId: user.id, keyHash, revokedAt: null, scopes: ['posts:write'] },
    create: {
      userId: user.id,
      keyPrefix,
      keyHash,
      name: 'Demo API key',
      scopes: ['posts:write'],
    },
  });

  // 4) Friendly summary.
   
  console.log(
    [
      '',
      '✓ Demo seed complete.',
      '',
      '  Dashboard:  http://localhost:3000/login',
      `  Email:      ${DEMO_EMAIL}`,
      `  Password:   ${DEMO_PASSWORD}`,
      '',
      '  API key:    ' + DEMO_API_KEY,
      '              Authorization: Bearer ' + DEMO_API_KEY,
      '',
      `  Connected:  ${SEED_ACCOUNTS.map((a) => a.platform).join(', ')}`,
      '',
      '  Remember to start the worker with MOCK_MODE=true so publishes',
      '  skip the real Google / Meta / X APIs:',
      '',
      '    MOCK_MODE=true pnpm --filter @omnipost/worker start:dev',
      '',
    ].join('\n'),
  );
}

main()
  .catch((err) => {
     
    console.error('Seed failed:', err instanceof Error ? err.stack : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));
