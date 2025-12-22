/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import type { Platform } from '@omnipost/db';
import type { BaseAdapter } from './base';
import { MetaAdapter } from './meta';
import { MockAdapter } from './mock';
import { XAdapter } from './x';
import { YouTubeAdapter } from './youtube';

/**
 * Strategy-pattern dispatcher. Construct the right adapter for a given target.
 *
 * Mock mode: pass `{ mock: true }` (or set `MOCK_MODE=true` in the env) to
 * route every platform through `MockAdapter`. This is what powers the demo
 * seed + local-dev flow when no real OAuth credentials are configured.
 *
 * `mediaUrlResolver` is injected so Meta can hand back a short-lived S3
 * presigned GET without coupling the adapter to AWS SDK internals.
 */
export interface MakeAdapterOptions {
  mediaUrlResolver?: (localPath: string) => Promise<string>;
  /** When omitted, falls back to `MOCK_MODE === 'true'`. */
  mock?: boolean;
}

export function makeAdapter(
  platform: Platform,
  opts: MakeAdapterOptions = {},
): BaseAdapter {
  const useMock = opts.mock ?? process.env.MOCK_MODE === 'true';
  if (useMock) return new MockAdapter(platform);

  switch (platform) {
    case 'YOUTUBE':
      return new YouTubeAdapter();
    case 'INSTAGRAM':
      return new MetaAdapter('INSTAGRAM', undefined, opts.mediaUrlResolver);
    case 'FACEBOOK':
      return new MetaAdapter('FACEBOOK', undefined, opts.mediaUrlResolver);
    case 'X':
      return new XAdapter();
    default: {
      const _exhaustive: never = platform;
      throw new Error(`No adapter for platform: ${String(_exhaustive)}`);
    }
  }
}

export * from './base';
export { YouTubeAdapter } from './youtube';
export { MetaAdapter } from './meta';
export { XAdapter } from './x';
export { MockAdapter } from './mock';
