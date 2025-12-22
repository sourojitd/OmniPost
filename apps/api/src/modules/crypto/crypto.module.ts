/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTokenCrypto, type TokenCrypto } from '@omnipost/crypto';

export const TOKEN_CRYPTO = Symbol('TOKEN_CRYPTO');

@Global()
@Module({
  providers: [
    {
      provide: TOKEN_CRYPTO,
      inject: [ConfigService],
      useFactory: (config: ConfigService): TokenCrypto =>
        createTokenCrypto(config.get<string>('OMNIPOST_DATA_KEY')),
    },
  ],
  exports: [TOKEN_CRYPTO],
})
export class CryptoModule {}
