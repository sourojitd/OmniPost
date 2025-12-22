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
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { UploadIntentDtoSchema, type UploadIntentDto } from '@omnipost/types';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtOrApiKeyGuard } from '../auth/auth.guard';
import { S3Service } from './s3.service';

const CompleteMultipartDtoSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().positive(),
        etag: z.string().min(1),
      }),
    )
    .min(1),
});

const AbortMultipartDtoSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

/** Sanitize a user-supplied filename's extension to `[a-z0-9]{1,5}`. */
function safeExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return 'bin';
  const raw = filename.slice(dot + 1).toLowerCase();
  const m = raw.match(/^[a-z0-9]{1,5}/);
  return m ? m[0] : 'bin';
}

function assertOwnsKey(userId: string, key: string): void {
  if (!key.startsWith(`u/${userId}/`)) {
    throw new ForbiddenException('Key is outside your namespace');
  }
}

@Controller('media')
@UseGuards(JwtOrApiKeyGuard)
export class MediaController {
  constructor(private readonly s3: S3Service) {}

  /**
   * Returns either:
   *  - { kind: 'single', url, key } for small uploads (< 100MB), or
   *  - { kind: 'multipart', uploadId, partUrls, key } for resumable chunked uploads.
   */
  @Post('upload-intent')
  @HttpCode(200)
  async uploadIntent(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(UploadIntentDtoSchema)) dto: UploadIntentDto,
  ) {
    const ext = safeExt(dto.filename);
    const key = `u/${user.id}/${Date.now()}-${nanoid(12)}.${ext}`;
    const useMultipart = dto.forceMultipart ?? this.s3.shouldUseMultipart(dto.sizeBytes);
    if (useMultipart) {
      return this.s3.presignMultipart({
        key,
        contentType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      });
    }
    return this.s3.presignSinglePut({ key, contentType: dto.mimeType });
  }

  @Post('multipart/complete')
  @HttpCode(200)
  async completeMultipart(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CompleteMultipartDtoSchema))
    dto: z.infer<typeof CompleteMultipartDtoSchema>,
  ) {
    assertOwnsKey(user.id, dto.key);
    const result = await this.s3.completeMultipart(dto);
    return { key: dto.key, location: result.Location };
  }

  /**
   * Abort a stuck/abandoned multipart upload. Strongly recommended after any
   * failed client-side upload so S3 doesn't bill for orphaned parts.
   */
  @Post('multipart/abort')
  @HttpCode(204)
  async abortMultipart(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(AbortMultipartDtoSchema))
    dto: z.infer<typeof AbortMultipartDtoSchema>,
  ): Promise<void> {
    assertOwnsKey(user.id, dto.key);
    await this.s3.abortMultipart(dto.key, dto.uploadId);
  }
}
