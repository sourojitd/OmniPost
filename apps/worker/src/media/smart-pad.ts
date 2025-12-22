/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import './ffmpeg-bin';
import ffmpeg from 'fluent-ffmpeg';
import type { Platform } from '@omnipost/db';
import type { MediaMetadata } from './ffprobe';

/**
 * Target aspect ratios per platform surface. These are the canonical "ideal"
 * shapes that maximize reach (Shorts/Reels = 9:16, classic Insta feed = 1:1,
 * YouTube longform = 16:9, X video = 16:9 or 1:1).
 */
export const PLATFORM_TARGET_RATIO: Record<Platform, number> = {
  YOUTUBE: 9 / 16, // when treated as Shorts; longform handled below
  INSTAGRAM: 9 / 16, // Reels-first
  FACEBOOK: 9 / 16, // Reels-first
  X: 16 / 9,
};

export interface ShapeDecision {
  needsTransform: boolean;
  reason: string;
  targetWidth: number;
  targetHeight: number;
}

/**
 * Decide whether the source media needs reshaping for a given platform.
 * Tolerance ~3% to avoid pointless re-encodes for near-matching aspect ratios.
 */
export function decideShape(meta: MediaMetadata, platform: Platform): ShapeDecision {
  const target = PLATFORM_TARGET_RATIO[platform];
  // For YouTube specifically, treat clips >60s as longform (16:9).
  const effectiveTarget =
    platform === 'YOUTUBE' && meta.durationSec > 60 ? 16 / 9 : target;
  const current = meta.aspectRatio || 1;
  const diff = Math.abs(current - effectiveTarget) / effectiveTarget;
  if (diff < 0.03) {
    return {
      needsTransform: false,
      reason: 'within-tolerance',
      targetWidth: meta.width,
      targetHeight: meta.height,
    };
  }
  // Compute canvas: keep the longer source dimension, derive the other from target ratio.
  let targetWidth: number;
  let targetHeight: number;
  if (effectiveTarget < 1) {
    // portrait target
    targetHeight = Math.max(meta.height, Math.round(meta.width / effectiveTarget));
    targetWidth = Math.round(targetHeight * effectiveTarget);
  } else {
    targetWidth = Math.max(meta.width, Math.round(meta.height * effectiveTarget));
    targetHeight = Math.round(targetWidth / effectiveTarget);
  }
  // Force even dimensions for H.264.
  targetWidth = targetWidth - (targetWidth % 2);
  targetHeight = targetHeight - (targetHeight % 2);

  return {
    needsTransform: true,
    reason: `aspect ${current.toFixed(3)} != target ${effectiveTarget.toFixed(3)}`,
    targetWidth,
    targetHeight,
  };
}

/**
 * Smart aspect-ratio guard: instead of rejecting a horizontal video sent to
 * Reels/Shorts/TikTok, we render a blurred, upscaled copy of the source as the
 * canvas, then overlay the fit-contained source on top. The end result is the
 * "Spotify-style" blurred-background look that platforms love and that keeps
 * users from cropping themselves out of the frame.
 *
 *   [blurred-bg upscaled to canvas, gblur=18] <-- bottom layer
 *   [source scaled to fit canvas with letterbox math] <-- top layer
 */
export function smartPad(
  inputPath: string,
  outputPath: string,
  shape: ShapeDecision,
): Promise<void> {
  const { targetWidth, targetHeight } = shape;

  // filter_complex graph
  const filter = [
    // bg: scale source to cover the canvas, then crop to canvas + blur it
    `[0:v]split=2[srcA][srcB]`,
    `[srcA]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},gblur=sigma=18[bg]`,
    // fg: scale source to fit (letterbox)
    `[srcB]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
    // composite
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]`,
  ].join(';');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .complexFilter(filter, 'v')
      .videoCodec('libx264')
      .outputOptions(['-preset veryfast', '-crf 22', '-movflags +faststart'])
      .audioCodec('aac')
      .audioBitrate('128k')
      .on('error', reject)
      .on('end', () => resolve())
      .save(outputPath);
  });
}
