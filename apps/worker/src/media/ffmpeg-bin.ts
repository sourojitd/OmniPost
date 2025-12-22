/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import ffmpeg from 'fluent-ffmpeg';

/**
 * Point fluent-ffmpeg at statically-bundled ffmpeg/ffprobe binaries so the
 * worker needs **no system install**. This module is imported for its side
 * effect by ffprobe.ts and smart-pad.ts before any ffmpeg call.
 *
 * If the static packages are unavailable for the current platform we silently
 * fall back to whatever `ffmpeg`/`ffprobe` is on PATH, so power users can still
 * BYO binary.
 */
function configure() {
  try {
     
    const ffmpegPath: string | null = require('ffmpeg-static');
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
  } catch {
    /* fall back to PATH */
  }
  try {
     
    const ffprobeStatic: { path: string } = require('ffprobe-static');
    if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);
  } catch {
    /* fall back to PATH */
  }
}

configure();

export {};
