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
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreatePostDtoSchema, type CreatePostDto } from '@omnipost/types';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtOrApiKeyGuard } from '../auth/auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtOrApiKeyGuard)
export class PostsController {
  constructor(private readonly svc: PostsService) {}

  @Post()
  @HttpCode(202)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(CreatePostDtoSchema)) dto: CreatePostDto,
  ) {
    return this.svc.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.svc.list(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.findOne(user.id, id);
  }
}
