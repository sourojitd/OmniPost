/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  HeadObjectCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface SinglePutPresign {
  kind: 'single';
  key: string;
  url: string;
  expiresIn: number;
}

export interface MultipartPresign {
  kind: 'multipart';
  key: string;
  uploadId: string;
  partSize: number;
  partUrls: { partNumber: number; url: string }[];
  expiresIn: number;
}

/** Switch to multipart when payload exceeds this threshold (100 MiB). */
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
/** S3 part size sweet spot; min is 5 MiB except for last part. */
const PART_SIZE = 16 * 1024 * 1024;

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client!: S3Client;
  private bucket!: string;
  private expiresIn!: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.expiresIn = Number(this.config.get('S3_PRESIGN_EXPIRES_SECONDS') ?? 3600);
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      forcePathStyle: Boolean(this.config.get('S3_FORCE_PATH_STYLE')),
      credentials: this.config.get('S3_ACCESS_KEY_ID')
        ? {
            accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
            secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
          }
        : undefined,
    });
  }

  getClient(): S3Client {
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }

  async presignSinglePut(opts: {
    key: string;
    contentType: string;
  }): Promise<SinglePutPresign> {
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: this.expiresIn });
    return { kind: 'single', key: opts.key, url, expiresIn: this.expiresIn };
  }

  async presignMultipart(opts: {
    key: string;
    contentType: string;
    sizeBytes: number;
    partSize?: number;
  }): Promise<MultipartPresign> {
    const partSize = opts.partSize ?? PART_SIZE;
    const init = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: opts.key,
        ContentType: opts.contentType,
      }),
    );
    if (!init.UploadId) throw new Error('S3 did not return an UploadId');

    const partCount = Math.ceil(opts.sizeBytes / partSize);
    const partUrls: { partNumber: number; url: string }[] = [];
    for (let i = 1; i <= partCount; i++) {
      const url = await getSignedUrl(
        this.client,
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: opts.key,
          UploadId: init.UploadId,
          PartNumber: i,
        }),
        { expiresIn: this.expiresIn },
      );
      partUrls.push({ partNumber: i, url });
    }

    return {
      kind: 'multipart',
      key: opts.key,
      uploadId: init.UploadId,
      partSize,
      partUrls,
      expiresIn: this.expiresIn,
    };
  }

  async completeMultipart(opts: {
    key: string;
    uploadId: string;
    parts: { partNumber: number; etag: string }[];
  }) {
    return this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: opts.key,
        UploadId: opts.uploadId,
        MultipartUpload: {
          Parts: opts.parts
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  async statObject(key: string) {
    return this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  shouldUseMultipart(sizeBytes: number): boolean {
    return sizeBytes >= MULTIPART_THRESHOLD;
  }
}
