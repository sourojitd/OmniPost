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
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createWriteStream, createReadStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export function makeS3() {
  return new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        }
      : undefined,
  });
}

const BUCKET = () => process.env.S3_BUCKET ?? 'omnipost-media';

export async function downloadToFile(s3: S3Client, key: string, localPath: string): Promise<void> {
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }));
  const body = resp.Body as Readable | undefined;
  if (!body) throw new Error(`S3 object body missing for ${key}`);
  await pipeline(body, createWriteStream(localPath));
}

export async function uploadFromFile(
  s3: S3Client,
  key: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    }),
  );
}
