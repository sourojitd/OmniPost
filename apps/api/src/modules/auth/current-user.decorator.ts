/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  email: string;
}

export const CurrentUser = createParamDecorator<unknown, ExecutionContext>(
  (_data, ctx) => ctx.switchToHttp().getRequest().user as CurrentUserPayload,
);
