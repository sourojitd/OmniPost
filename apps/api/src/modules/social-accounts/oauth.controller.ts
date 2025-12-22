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
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotImplementedException,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OAuthStateService } from './oauth-state.service';
import {
  metaAuthorizeUrl,
  metaExchange,
  metaIdentities,
  xAuthorizeUrl,
  xExchange,
  xIdentity,
  youtubeAuthorizeUrl,
  youtubeExchange,
  youtubeIdentity,
} from './oauth-providers';
import { SocialAccountsService } from './social-accounts.service';

type ProviderKey = 'youtube' | 'meta' | 'x';
const VALID_PROVIDERS: readonly ProviderKey[] = ['youtube', 'meta', 'x'];

@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly state: OAuthStateService,
    private readonly accounts: SocialAccountsService,
  ) {}

  @Get(':provider/start')
  @UseGuards(JwtAuthGuard)
  async start(@CurrentUser() user: CurrentUserPayload, @Param('provider') provider: string) {
    if (!VALID_PROVIDERS.includes(provider as ProviderKey)) {
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }
    const p = provider as ProviderKey;

    if (p === 'youtube') {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
      const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
      if (!clientId || !redirectUri) throw new NotImplementedException('YouTube OAuth not configured');
      const state = await this.state.issue({ userId: user.id, provider: p });
      return { authorizeUrl: youtubeAuthorizeUrl({ clientId, redirectUri, state }) };
    }

    if (p === 'meta') {
      const clientId = this.config.get<string>('META_APP_ID');
      const redirectUri = this.config.get<string>('META_REDIRECT_URI');
      if (!clientId || !redirectUri) throw new NotImplementedException('Meta OAuth not configured');
      const state = await this.state.issue({ userId: user.id, provider: p });
      return { authorizeUrl: metaAuthorizeUrl({ clientId, redirectUri, state }) };
    }

    // p === 'x'
    const clientId = this.config.get<string>('X_CLIENT_ID');
    const redirectUri = this.config.get<string>('X_REDIRECT_URI');
    if (!clientId || !redirectUri) throw new NotImplementedException('X OAuth not configured');
    const pkce = OAuthStateService.createPkce();
    const state = await this.state.issue({
      userId: user.id,
      provider: p,
      pkceVerifier: pkce.verifier,
    });
    return {
      authorizeUrl: xAuthorizeUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge: pkce.challenge,
      }),
    };
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    if (!VALID_PROVIDERS.includes(provider as ProviderKey)) {
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }
    const p = provider as ProviderKey;
    res.header('content-type', 'text/html; charset=utf-8');

    if (error) {
      this.logger.warn(`OAuth provider returned error for ${p}: ${error}`);
      return this.renderPage(false, `Provider declined the request: ${error}`);
    }
    if (!code || !state) {
      return this.renderPage(false, 'Missing code or state in callback');
    }

    let payload;
    try {
      payload = await this.state.consume(state);
    } catch (e) {
      return this.renderPage(false, e instanceof Error ? e.message : 'Invalid state');
    }
    if (payload.provider !== p) {
      return this.renderPage(false, 'OAuth state/provider mismatch');
    }

    try {
      if (p === 'youtube') {
        const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.config.getOrThrow<string>('GOOGLE_REDIRECT_URI');
        const tok = await youtubeExchange({ code, clientId, clientSecret, redirectUri });
        const id = await youtubeIdentity(tok.accessToken);
        await this.accounts.upsert({
          userId: payload.userId,
          platform: id.platform,
          platformAccountId: id.platformAccountId,
          handle: id.handle ?? null,
          accessToken: tok.accessToken,
          refreshToken: tok.refreshToken ?? null,
          tokenExpiresAt: tok.expiresInSec ? new Date(Date.now() + tok.expiresInSec * 1000) : null,
          scopes: tok.scope?.split(' ') ?? [],
          meta: id.meta ?? null,
        });
      } else if (p === 'meta') {
        const clientId = this.config.getOrThrow<string>('META_APP_ID');
        const clientSecret = this.config.getOrThrow<string>('META_APP_SECRET');
        const redirectUri = this.config.getOrThrow<string>('META_REDIRECT_URI');
        const tok = await metaExchange({ code, clientId, clientSecret, redirectUri });
        const identities = await metaIdentities(tok.accessToken);
        if (identities.length === 0) {
          return this.renderPage(
            false,
            'No Pages or Instagram business accounts were granted. Re-run the flow with at least one Page selected.',
          );
        }
        for (const id of identities) {
          await this.accounts.upsert({
            userId: payload.userId,
            platform: id.platform,
            platformAccountId: id.platformAccountId,
            handle: id.handle ?? null,
            // Store the Page token (publishing credential) encrypted at rest;
            // fall back to the user token only if a page token wasn't returned.
            accessToken: id.accessToken ?? tok.accessToken,
            refreshToken: null,
            tokenExpiresAt: tok.expiresInSec
              ? new Date(Date.now() + tok.expiresInSec * 1000)
              : null,
            scopes: [],
            meta: id.meta ?? null,
          });
        }
      } else {
        // X
        if (!payload.pkceVerifier) {
          return this.renderPage(false, 'Missing PKCE verifier for X callback');
        }
        const clientId = this.config.getOrThrow<string>('X_CLIENT_ID');
        const clientSecret = this.config.get<string>('X_CLIENT_SECRET');
        const redirectUri = this.config.getOrThrow<string>('X_REDIRECT_URI');
        const tok = await xExchange({
          code,
          clientId,
          clientSecret,
          redirectUri,
          codeVerifier: payload.pkceVerifier,
        });
        const id = await xIdentity(tok.accessToken);
        await this.accounts.upsert({
          userId: payload.userId,
          platform: id.platform,
          platformAccountId: id.platformAccountId,
          handle: id.handle ?? null,
          accessToken: tok.accessToken,
          refreshToken: tok.refreshToken ?? null,
          tokenExpiresAt: tok.expiresInSec ? new Date(Date.now() + tok.expiresInSec * 1000) : null,
          scopes: tok.scope?.split(' ') ?? [],
          meta: id.meta ?? null,
        });
      }
    } catch (e) {
      // Never echo upstream tokens; log the body server-side only.
      const msg = e instanceof Error ? e.message : 'Token exchange failed';
      this.logger.error(`OAuth callback failed for ${p}: ${msg}`);
      return this.renderPage(false, 'Token exchange failed. See server logs.');
    }

    return this.renderPage(true, `Connected ${p}.`);
  }

  private renderPage(ok: boolean, msg: string): string {
    const color = ok ? '#22c55e' : '#ef4444';
    return `
      <!doctype html><meta charset="utf-8"><title>OmniPost OAuth</title>
      <body style="font-family:system-ui;padding:2rem;max-width:640px;margin:auto;background:#0b0b10;color:#e9e9f1">
        <h1 style="margin:0">OmniPost</h1>
        <p style="color:${color};font-weight:600">${ok ? 'Success' : 'Failed'}</p>
        <p>${msg}</p>
        <p><a href="/dashboard/connections" style="color:#a78bfa">Return to dashboard</a></p>
      </body>
    `;
  }
}
