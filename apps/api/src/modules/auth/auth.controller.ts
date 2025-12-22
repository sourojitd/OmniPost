/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { LoginDtoSchema, RegisterDtoSchema, type LoginDto, type RegisterDto } from '@omnipost/types';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser, type CurrentUserPayload } from './current-user.decorator';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(201)
  register(@Body(new ZodValidationPipe(RegisterDtoSchema)) dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(LoginDtoSchema)) dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }
}
