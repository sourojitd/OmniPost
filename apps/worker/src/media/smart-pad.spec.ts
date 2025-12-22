/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { decideShape, PLATFORM_TARGET_RATIO } from './smart-pad';
import type { MediaMetadata } from './ffprobe';

function meta(width: number, height: number, duration = 15): MediaMetadata {
  return {
    width,
    height,
    aspectRatio: width / height,
    durationSec: duration,
    hasVideo: true,
    hasAudio: true,
  };
}

describe('decideShape', () => {
  it('passes 9:16 source to Instagram untouched', () => {
    const d = decideShape(meta(1080, 1920), 'INSTAGRAM');
    expect(d.needsTransform).toBe(false);
  });

  it('pads horizontal source for Instagram Reels', () => {
    const d = decideShape(meta(1920, 1080), 'INSTAGRAM');
    expect(d.needsTransform).toBe(true);
    // target must respect 9:16
    expect(d.targetWidth / d.targetHeight).toBeCloseTo(PLATFORM_TARGET_RATIO.INSTAGRAM, 2);
    // even dimensions for H.264
    expect(d.targetWidth % 2).toBe(0);
    expect(d.targetHeight % 2).toBe(0);
  });

  it('routes YouTube >60s as 16:9 longform', () => {
    const d = decideShape(meta(1920, 1080, 120), 'YOUTUBE');
    expect(d.needsTransform).toBe(false);
  });

  it('routes YouTube <=60s as 9:16 Shorts', () => {
    const d = decideShape(meta(1920, 1080, 30), 'YOUTUBE');
    expect(d.needsTransform).toBe(true);
  });

  it('keeps 16:9 source for X', () => {
    const d = decideShape(meta(1920, 1080, 20), 'X');
    expect(d.needsTransform).toBe(false);
  });
});
