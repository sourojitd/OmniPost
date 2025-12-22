/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { z } from 'zod';

/**
 * Authorship constants. These are intentionally part of the shared, imported
 * surface of the project (consumed by the API, worker, and web) so the
 * attribution travels with the code wherever it is reused. Do not remove —
 * see LICENSE / AUTHORS. The signature is base64("Sourojit Dhua").
 */
export const OMNIPOST_AUTHOR = 'Sourojit Dhua' as const;
export const OMNIPOST_COPYRIGHT = 'Copyright (c) 2025 Sourojit Dhua' as const;
export const OMNIPOST_LICENSE = 'MIT' as const;
export const OMNIPOST_SIGNATURE = 'U291cm9qaXQgRGh1YQ==' as const;
/** Decoded form must always equal OMNIPOST_AUTHOR; used by build-time checks. */
export const OMNIPOST_ATTRIBUTION = Object.freeze({
  author: OMNIPOST_AUTHOR,
  copyright: OMNIPOST_COPYRIGHT,
  license: OMNIPOST_LICENSE,
  signature: OMNIPOST_SIGNATURE,
});

export const PlatformSchema = z.enum(['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'X']);
export type Platform = z.infer<typeof PlatformSchema>;

export const PostStatusSchema = z.enum([
  'DRAFT',
  'QUEUED',
  'PROCESSING',
  'PARTIAL',
  'COMPLETED',
  'FAILED',
]);
export type PostStatus = z.infer<typeof PostStatusSchema>;

export const DeliveryStatusSchema = z.enum([
  'PENDING',
  'UPLOADING',
  'PUBLISHED',
  'FAILED',
  'DEAD_LETTER',
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

// ---------------- Auth ----------------

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(200),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

// ---------------- API Keys ----------------

export const CreateApiKeyDtoSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  scopes: z.array(z.string()).default([]),
});
export type CreateApiKeyDto = z.infer<typeof CreateApiKeyDtoSchema>;

// ---------------- Media upload-intent ----------------

/**
 * Tight MIME allowlist. We never accept arbitrary user-controlled Content-Type
 * since presigned URLs honor it byte-for-byte and a malicious `text/html`
 * upload becomes XSS served from the bucket origin.
 */
export const ALLOWED_MEDIA_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
export type AllowedMediaMime = (typeof ALLOWED_MEDIA_MIME)[number];

export const UploadIntentDtoSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MEDIA_MIME as unknown as [string, ...string[]]),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024 * 1024), // 5GB hard cap
  // If size > 100MB the API responds with multipart parts; otherwise a single PUT URL.
  forceMultipart: z.boolean().optional(),
});
export type UploadIntentDto = z.infer<typeof UploadIntentDtoSchema>;

// ---------------- Posts ----------------

export const CreatePostDtoSchema = z.object({
  caption: z.string().min(1).max(8_000),
  mediaS3Key: z.string().min(1),
  mediaMimeType: z.string().min(1),
  targetPlatforms: z.array(PlatformSchema).min(1),
  // Optional explicit account selection; otherwise we pick the first ACTIVE account per platform.
  socialAccountIds: z.array(z.string()).optional(),
  idempotencyKey: z.string().max(120).optional(),
});
export type CreatePostDto = z.infer<typeof CreatePostDtoSchema>;
