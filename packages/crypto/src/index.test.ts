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
  createTokenCrypto,
  generateMasterKey,
  CryptoConfigError,
  CryptoDecryptError,
  constantTimeEqual,
} from './index';

describe('@omnipost/crypto', () => {
  const key = generateMasterKey();

  it('round-trips a plaintext', () => {
    const c = createTokenCrypto(key);
    const blob = c.encrypt('ya29.A0AfH6SMB-this-is-a-fake-access-token');
    expect(blob.startsWith('v1:')).toBe(true);
    expect(c.decrypt(blob)).toBe('ya29.A0AfH6SMB-this-is-a-fake-access-token');
  });

  it('produces a unique ciphertext per encryption (random IV)', () => {
    const c = createTokenCrypto(key);
    const a = c.encrypt('same-plaintext');
    const b = c.encrypt('same-plaintext');
    expect(a).not.toBe(b);
    expect(c.decrypt(a)).toBe(c.decrypt(b));
  });

  it('detects tampered ciphertext via authTag', () => {
    const c = createTokenCrypto(key);
    const blob = c.encrypt('secret');
    const [v, iv, tag, ct] = blob.split(':');
    // Flip one bit in the ciphertext.
    const bad = Buffer.from(ct, 'base64');
    bad[0] = bad[0] ^ 0x01;
    const tampered = [v, iv, tag, bad.toString('base64')].join(':');
    expect(() => c.decrypt(tampered)).toThrow(CryptoDecryptError);
  });

  it('rejects wrong-key decryption', () => {
    const c1 = createTokenCrypto(generateMasterKey());
    const c2 = createTokenCrypto(generateMasterKey());
    const blob = c1.encrypt('hello');
    expect(() => c2.decrypt(blob)).toThrow(CryptoDecryptError);
  });

  it('rejects malformed blobs', () => {
    const c = createTokenCrypto(key);
    expect(() => c.decrypt('not-a-real-blob')).toThrow(CryptoDecryptError);
    expect(() => c.decrypt('v2:a:b:c')).toThrow(CryptoDecryptError);
  });

  it('throws when no master key is configured', () => {
    const prev = process.env.OMNIPOST_DATA_KEY;
    delete process.env.OMNIPOST_DATA_KEY;
    try {
      expect(() => createTokenCrypto()).toThrow(CryptoConfigError);
    } finally {
      if (prev) process.env.OMNIPOST_DATA_KEY = prev;
    }
  });

  it('constantTimeEqual compares strings safely', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
