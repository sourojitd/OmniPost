/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { ForbiddenException } from '@nestjs/common';
import { MediaController } from './media.controller';

function makeS3() {
  return {
    shouldUseMultipart: jest.fn((bytes: number) => bytes >= 100 * 1024 * 1024),
    presignSinglePut: jest.fn(async ({ key }: any) => ({ kind: 'single', key, url: 'u' })),
    presignMultipart: jest.fn(async ({ key }: any) => ({ kind: 'multipart', key, uploadId: 'up' })),
    completeMultipart: jest.fn(async () => ({ Location: 'http://x' })),
    abortMultipart: jest.fn(async () => undefined),
  } as any;
}

describe('MediaController', () => {
  const user = { id: 'u1', email: 'a@b.com' };

  it('sanitizes user-supplied filename extensions (no path traversal)', async () => {
    const s3 = makeS3();
    const ctrl = new MediaController(s3);
    await ctrl.uploadIntent(user, {
      filename: 'evil.mp4/../../etc/passwd',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    const key = (s3.presignSinglePut.mock.calls[0][0] as any).key as string;
    // Must live under the caller's namespace.
    expect(key.startsWith('u/u1/')).toBe(true);
    // The "last" extension here is the traversal junk, not "mp4", so we
    // conservatively fall back to .bin. The important guarantee is that no
    // user input bleeds into the key path.
    expect(key).toMatch(/\.(bin|mp4)$/);
    expect(key).not.toContain('..');
    // Only the namespace separator and the timestamp/extension slash exist.
    expect(key.split('/').length).toBe(3);
  });

  it('extracts a clean extension from a normal filename', async () => {
    const s3 = makeS3();
    const ctrl = new MediaController(s3);
    await ctrl.uploadIntent(user, {
      filename: 'my-cool-video.MP4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    const key = (s3.presignSinglePut.mock.calls[0][0] as any).key as string;
    expect(key).toMatch(/\.mp4$/); // lowercased
  });

  it('rejects filename extension containing dangerous chars by falling back', async () => {
    const s3 = makeS3();
    const ctrl = new MediaController(s3);
    await ctrl.uploadIntent(user, {
      filename: 'x.<script>',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    const key = (s3.presignSinglePut.mock.calls[0][0] as any).key as string;
    expect(key).toMatch(/\.bin$/);
  });

  it('falls back to .bin for missing/unsafe extension', async () => {
    const s3 = makeS3();
    const ctrl = new MediaController(s3);
    await ctrl.uploadIntent(user, {
      filename: 'noextension',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    } as any);
    const key = (s3.presignSinglePut.mock.calls[0][0] as any).key as string;
    expect(key).toMatch(/\.bin$/);
  });

  it('switches to multipart automatically above the threshold', async () => {
    const s3 = makeS3();
    const ctrl = new MediaController(s3);
    await ctrl.uploadIntent(user, {
      filename: 'big.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 200 * 1024 * 1024,
    } as any);
    expect(s3.presignMultipart).toHaveBeenCalled();
    expect(s3.presignSinglePut).not.toHaveBeenCalled();
  });

  it('completeMultipart rejects cross-tenant keys with ForbiddenException', async () => {
    const ctrl = new MediaController(makeS3());
    await expect(
      ctrl.completeMultipart(user, {
        key: 'u/u2/other.mp4',
        uploadId: 'x',
        parts: [{ partNumber: 1, etag: 'e' }],
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('abortMultipart rejects cross-tenant keys with ForbiddenException', async () => {
    const ctrl = new MediaController(makeS3());
    await expect(
      ctrl.abortMultipart(user, { key: 'u/u2/other.mp4', uploadId: 'x' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
