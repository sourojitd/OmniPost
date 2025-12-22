/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import axios from 'axios';
import { Platform } from '@omnipost/db';

/**
 * Per-provider definitions: authorize URL builder, code exchange, "who am I"
 * lookup so we can derive `platformAccountId` + handle. Each function uses
 * Authorization: Bearer header — never tokens in query strings.
 */

export interface ExchangedToken {
  accessToken: string;
  refreshToken?: string | null;
  expiresInSec?: number;
  scope?: string;
}

export interface RemoteIdentity {
  platform: Platform;
  platformAccountId: string;
  handle?: string | null;
  meta?: Record<string, unknown>;
  /**
   * Optional per-identity access token that should be stored (encrypted) as
   * this account's access token instead of the user-level token. Used for Meta
   * Page tokens, which are the credential actually used to publish and must
   * NOT be persisted in plaintext `meta`.
   */
  accessToken?: string;
}

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];
export const META_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_manage_posts',
  'publish_video',
  'business_management',
];
export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

// ---------------- YouTube (Google) ----------------

export function youtubeAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  u.searchParams.set('state', opts.state);
  return u.toString();
}

export async function youtubeExchange(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<ExchangedToken> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: 'authorization_code',
  });
  const r = await axios.post('https://oauth2.googleapis.com/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return {
    accessToken: r.data.access_token,
    refreshToken: r.data.refresh_token ?? null,
    expiresInSec: r.data.expires_in,
    scope: r.data.scope,
  };
}

export async function youtubeIdentity(accessToken: string): Promise<RemoteIdentity> {
  const r = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: { part: 'snippet', mine: 'true' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const ch = r.data?.items?.[0];
  if (!ch) throw new Error('YouTube returned no channel for this token');
  return {
    platform: Platform.YOUTUBE,
    platformAccountId: ch.id,
    handle: ch.snippet?.title ?? null,
    meta: { thumbnail: ch.snippet?.thumbnails?.default?.url },
  };
}

// ---------------- Meta (Instagram + Facebook) ----------------

export function metaAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', META_SCOPES.join(','));
  u.searchParams.set('state', opts.state);
  return u.toString();
}

export async function metaExchange(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<ExchangedToken> {
  // Short-lived token first.
  const short = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
    params: {
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      code: opts.code,
    },
  });
  // Exchange for a ~60-day long-lived token.
  const long = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      fb_exchange_token: short.data.access_token,
    },
  });
  return {
    accessToken: long.data.access_token,
    refreshToken: null, // Meta doesn't issue refresh tokens; long-lived re-exchange happens on demand.
    expiresInSec: long.data.expires_in,
  };
}

/**
 * For Meta we pick the first managed Page + its connected IG Business account.
 * In production we'd let the user pick which Page to connect; here we record
 * both ids and reuse them when publishing.
 */
export async function metaIdentities(accessToken: string): Promise<RemoteIdentity[]> {
  const pages = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
    params: { fields: 'id,name,access_token,instagram_business_account' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const out: RemoteIdentity[] = [];
  for (const page of pages.data?.data ?? []) {
    // The page access_token is the long-lived credential used to publish.
    if (page.instagram_business_account?.id) {
      out.push({
        platform: Platform.INSTAGRAM,
        platformAccountId: page.instagram_business_account.id,
        handle: page.name,
        // Page token is the publishing credential — persisted encrypted via
        // `accessToken`, never in plaintext `meta`.
        accessToken: page.access_token,
        meta: { igUserId: page.instagram_business_account.id, pageId: page.id },
      });
    }
    out.push({
      platform: Platform.FACEBOOK,
      platformAccountId: page.id,
      handle: page.name,
      accessToken: page.access_token,
      meta: { pageId: page.id },
    });
  }
  return out;
}

// ---------------- X (Twitter v2, OAuth2 + PKCE) ----------------

export function xAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL('https://twitter.com/i/oauth2/authorize');
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', X_SCOPES.join(' '));
  u.searchParams.set('state', opts.state);
  u.searchParams.set('code_challenge', opts.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export async function xExchange(opts: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<ExchangedToken> {
  const body = new URLSearchParams({
    code: opts.code,
    grant_type: 'authorization_code',
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
  const auth =
    opts.clientSecret && opts.clientSecret.length > 0
      ? {
          Authorization:
            'Basic ' + Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64'),
        }
      : {};
  const r = await axios.post('https://api.twitter.com/2/oauth2/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...auth },
  });
  return {
    accessToken: r.data.access_token,
    refreshToken: r.data.refresh_token ?? null,
    expiresInSec: r.data.expires_in,
    scope: r.data.scope,
  };
}

export async function xIdentity(accessToken: string): Promise<RemoteIdentity> {
  const r = await axios.get('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const u = r.data?.data;
  if (!u?.id) throw new Error('X returned no user');
  return {
    platform: Platform.X,
    platformAccountId: u.id,
    handle: u.username ? `@${u.username}` : null,
  };
}

// ---------------- Refresh (used by the worker) ----------------

export async function refreshAccessToken(
  platform: Platform,
  refreshToken: string,
  env: {
    googleClientId?: string;
    googleClientSecret?: string;
    xClientId?: string;
    xClientSecret?: string;
  },
): Promise<ExchangedToken> {
  if (platform === Platform.YOUTUBE) {
    if (!env.googleClientId || !env.googleClientSecret) {
      throw new Error('Google client credentials are not configured');
    }
    const body = new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const r = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return {
      accessToken: r.data.access_token,
      refreshToken,
      expiresInSec: r.data.expires_in,
    };
  }
  if (platform === Platform.X) {
    if (!env.xClientId) throw new Error('X client id not configured');
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: env.xClientId,
    });
    const auth =
      env.xClientSecret && env.xClientSecret.length > 0
        ? {
            Authorization:
              'Basic ' +
              Buffer.from(`${env.xClientId}:${env.xClientSecret}`).toString('base64'),
          }
        : {};
    const r = await axios.post('https://api.twitter.com/2/oauth2/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...auth },
    });
    return {
      accessToken: r.data.access_token,
      refreshToken: r.data.refresh_token ?? refreshToken,
      expiresInSec: r.data.expires_in,
    };
  }
  // Meta has no refresh-token grant; long-lived tokens are re-issued via
  // fb_exchange_token using the previous (still-valid) long-lived token.
  throw new Error(`Refresh not supported for ${platform}`);
}
