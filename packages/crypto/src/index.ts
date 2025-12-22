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
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  timingSafeEqual,
} from 'crypto';

/**
 * AES-256-GCM authenticated encryption for storing third-party OAuth tokens
 * at rest. Format (versioned for future key rotation):
 *
 *   v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * - iv: 12 random bytes (GCM standard)
 * - authTag: 16 bytes
 * - ciphertext: variable
 *
 * The master key is supplied as a 32-byte value, base64-encoded, via the
 * `OMNIPOST_DATA_KEY` environment variable. Tampered ciphertexts will
 * throw at decryption time (authTag verification).
 */

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_LEN = 32;

export class CryptoConfigError extends Error {}
export class CryptoDecryptError extends Error {}

function loadKey(rawKey?: string): Buffer {
  const v = rawKey ?? process.env.OMNIPOST_DATA_KEY;
  if (!v) {
    throw new CryptoConfigError(
      'OMNIPOST_DATA_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(v, 'base64');
  } catch {
    throw new CryptoConfigError('OMNIPOST_DATA_KEY must be base64-encoded.');
  }
  // Allow raw hex/utf8 fallback only if it happens to be 32 bytes; otherwise hash to 32.
  if (buf.length === KEY_LEN) return buf;
  // Deterministic widening so an operator-supplied passphrase still works,
  // but we strongly recommend a proper random 32-byte key.
  return createHash('sha256').update(v).digest();
}

export interface TokenCrypto {
  encrypt(plaintext: string): string;
  decrypt(blob: string): string;
}

export function createTokenCrypto(rawKey?: string): TokenCrypto {
  const key = loadKey(rawKey);

  return {
    encrypt(plaintext: string): string {
      if (typeof plaintext !== 'string') {
        throw new TypeError('encrypt() expects a string');
      }
      const iv = randomBytes(IV_LEN);
      const cipher = createCipheriv(ALGO, key, iv);
      const ct = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return [
        VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        ct.toString('base64'),
      ].join(':');
    },

    decrypt(blob: string): string {
      if (typeof blob !== 'string') {
        throw new TypeError('decrypt() expects a string');
      }
      const parts = blob.split(':');
      if (parts.length !== 4) {
        throw new CryptoDecryptError('Malformed ciphertext: expected 4 parts');
      }
      const [version, ivB64, tagB64, ctB64] = parts;
      if (version !== VERSION) {
        throw new CryptoDecryptError(`Unsupported ciphertext version: ${version}`);
      }
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const ct = Buffer.from(ctB64, 'base64');
      if (iv.length !== IV_LEN || authTag.length !== 16) {
        throw new CryptoDecryptError('Malformed ciphertext: bad IV/tag length');
      }
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(authTag);
      try {
        const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
        return pt.toString('utf8');
      } catch {
        throw new CryptoDecryptError(
          'Decryption failed: ciphertext tampered or wrong key',
        );
      }
    },
  };
}

/**
 * Constant-time string compare. Useful when comparing API key hashes,
 * webhook signatures, etc.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Generate a fresh master key. Use only at provisioning time:
 *
 *   node -e "console.log(require('@omnipost/crypto').generateMasterKey())"
 */
export function generateMasterKey(): string {
  return randomBytes(KEY_LEN).toString('base64');
}
