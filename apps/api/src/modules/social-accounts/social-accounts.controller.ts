/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SocialAccountsService } from './social-accounts.service';

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountsController {
  constructor(private readonly svc: SocialAccountsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.svc.list(user.id);
  }

  @Delete(':id')
  disconnect(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.disconnect(user.id, id);
  }
}
