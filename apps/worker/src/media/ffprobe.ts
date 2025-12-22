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

export interface MediaMetadata {
  durationSec: number;
  width: number;
  height: number;
  aspectRatio: number;
  videoCodec?: string;
  audioCodec?: string;
  format?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export function probe(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const v = data.streams.find((s) => s.codec_type === 'video');
      const a = data.streams.find((s) => s.codec_type === 'audio');
      const width = v?.width ?? 0;
      const height = v?.height ?? 0;
      resolve({
        durationSec: Number(data.format?.duration ?? 0),
        width,
        height,
        aspectRatio: width && height ? width / height : 0,
        videoCodec: v?.codec_name,
        audioCodec: a?.codec_name,
        format: data.format?.format_name,
        hasVideo: Boolean(v),
        hasAudio: Boolean(a),
      });
    });
  });
}
