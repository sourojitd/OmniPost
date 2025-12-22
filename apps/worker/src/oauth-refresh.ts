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
 * Worker-side refresh-token grant. Only YouTube (Google) and X support
 * refresh; Meta long-lived tokens are reissued via fb_exchange_token using a
 * previous (still-valid) long-lived token — when ours expires there's nothing
 * we can do without user re-consent, so we mark the account EXPIRED.
 */

export interface RefreshedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
}

export async function refreshAccessToken(
  platform: Platform,
  refreshToken: string,
): Promise<RefreshedToken> {
  if (platform === Platform.YOUTUBE) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Google client credentials not configured');
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    const r = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return {
      accessToken: r.data.access_token,
      refreshToken,
      expiresAt: r.data.expires_in ? new Date(Date.now() + r.data.expires_in * 1000) : null,
    };
  }

  if (platform === Platform.X) {
    const clientId = process.env.X_CLIENT_ID;
    if (!clientId) throw new Error('X client id not configured');
    const clientSecret = process.env.X_CLIENT_SECRET;
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: clientId,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (clientSecret) {
      headers.Authorization =
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }
    const r = await axios.post('https://api.twitter.com/2/oauth2/token', body, { headers });
    return {
      accessToken: r.data.access_token,
      refreshToken: r.data.refresh_token ?? refreshToken,
      expiresAt: r.data.expires_in ? new Date(Date.now() + r.data.expires_in * 1000) : null,
    };
  }

  throw new Error(`Refresh not supported for ${platform}`);
}
