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
import MockAdapter from 'axios-mock-adapter';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeAdapter, AdapterError } from './index';
import { MetaAdapter } from './meta';
import { YouTubeAdapter } from './youtube';
import { XAdapter } from './x';
import type { AdapterContext } from './base';
import type { MediaMetadata } from '../media/ffprobe';

function makeFakeMedia(sizeBytes = 1024): string {
  const dir = mkdtempSync(join(tmpdir(), 'omnipost-test-'));
  const p = join(dir, 'fake.mp4');
  writeFileSync(p, Buffer.alloc(sizeBytes, 0x42));
  return p;
}

function fakeMeta(partial: Partial<MediaMetadata> = {}): MediaMetadata {
  return {
    durationSec: 20,
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    hasVideo: true,
    hasAudio: true,
    ...partial,
  };
}

function baseCtx(overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    accessToken: 'fake-token',
    refreshToken: 'fake-refresh',
    localMediaPath: makeFakeMedia(),
    meta: fakeMeta(),
    caption: 'Hello world',
    platformMeta: { igUserId: '17841400000000000', pageId: '99999' },
    ...overrides,
  };
}

describe('makeAdapter dispatcher', () => {
  it('returns the correct adapter class per platform', () => {
    expect(makeAdapter('YOUTUBE')).toBeInstanceOf(YouTubeAdapter);
    expect(makeAdapter('INSTAGRAM')).toBeInstanceOf(MetaAdapter);
    expect(makeAdapter('FACEBOOK')).toBeInstanceOf(MetaAdapter);
    expect(makeAdapter('X')).toBeInstanceOf(XAdapter);
  });
});

describe('YouTubeAdapter (mocked)', () => {
  it('uploads via resumable session and tags Shorts', async () => {
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock
      .onPost(/upload\/youtube\/v3\/videos/)
      .reply(200, '', { location: 'https://upload.example/session-1' });
    mock.onPut('https://upload.example/session-1').reply(200, { id: 'vid_abc' });

    const adapter = new YouTubeAdapter(http);
    const res = await adapter.publish(baseCtx({ meta: fakeMeta({ durationSec: 30 }) }));
    expect(res.remoteId).toBe('vid_abc');
    expect(res.remoteUrl).toContain('youtube.com/shorts/vid_abc');
  });

  it('marks 5xx as retryable AdapterError', async () => {
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock.onPost(/upload\/youtube\/v3\/videos/).reply(503, { error: 'try later' });

    const adapter = new YouTubeAdapter(http);
    await expect(adapter.publish(baseCtx())).rejects.toMatchObject({
      name: 'AdapterError',
      retryable: true,
    });
  });
});

describe('MetaAdapter (mocked)', () => {
  it('walks container -> poll -> publish for Reels', async () => {
    const http = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const mock = new MockAdapter(http);
    mock.onPost(/\/17841400000000000\/media$/).reply(200, { id: 'cont_1' });
    let polls = 0;
    mock.onGet(/\/cont_1$/).reply(() => {
      polls += 1;
      return [200, { status_code: polls < 2 ? 'IN_PROGRESS' : 'FINISHED' }];
    });
    mock.onPost(/\/17841400000000000\/media_publish$/).reply(200, { id: 'media_42' });

    const adapter = new MetaAdapter(
      'INSTAGRAM',
      http,
      async () => 'https://signed.example/file.mp4',
      { intervalMs: 1, timeoutMs: 5000 },
    );
    const res = await adapter.publish(baseCtx());
    expect(res.remoteId).toBe('media_42');
    expect(polls).toBeGreaterThanOrEqual(2);
  });

  it('throws when SocialAccount.meta lacks the required target id', async () => {
    const http = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const adapter = new MetaAdapter('INSTAGRAM', http, async () => 'https://x/y');
    await expect(adapter.publish(baseCtx({ platformMeta: {} }))).rejects.toMatchObject({
      code: 'meta.missing_target_id',
    });
  });

  it('flags 401 as auth error so the worker will refresh', async () => {
    const http = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const mock = new MockAdapter(http);
    mock
      .onPost(/\/17841400000000000\/media$/)
      .reply(401, { error: { code: 190, message: 'access token expired' } });
    const adapter = new MetaAdapter(
      'INSTAGRAM',
      http,
      async () => 'https://x/y',
      { intervalMs: 1, timeoutMs: 1000 },
    );
    const err = await adapter.publish(baseCtx()).catch((e) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect(err.retryable).toBe(true);
    expect(err.isAuthError).toBe(true);
    expect(err.code).toBe('fb.190');
  });

  it('never sends access_token in query params (header auth only)', async () => {
    const http = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const mock = new MockAdapter(http);
    let observedAuthHeader: string | undefined;
    let observedParams: any;
    mock.onPost(/\/17841400000000000\/media$/).reply((config) => {
      observedAuthHeader = (config.headers as any)?.Authorization;
      observedParams = config.params;
      return [200, { id: 'cont_X' }];
    });
    mock.onGet(/\/cont_X$/).reply(200, { status_code: 'FINISHED' });
    mock.onPost(/\/17841400000000000\/media_publish$/).reply(200, { id: 'm_X' });
    mock.onGet(/\/m_X$/).reply(200, { permalink: 'https://insta/p/abc/' });

    const adapter = new MetaAdapter(
      'INSTAGRAM',
      http,
      async () => 'https://x/y',
      { intervalMs: 1, timeoutMs: 1000 },
    );
    await adapter.publish(baseCtx());
    expect(observedAuthHeader).toMatch(/^Bearer /);
    expect(observedParams?.access_token).toBeUndefined();
  });

  it('surfaces fb error code as retryable on 429', async () => {
    const http = axios.create({ baseURL: 'https://graph.facebook.com/v21.0' });
    const mock = new MockAdapter(http);
    mock.onPost(/\/17841400000000000\/media$/).reply(429, { error: { code: 4, message: 'rate limit' } });
    const adapter = new MetaAdapter(
      'INSTAGRAM',
      http,
      async () => 'https://x/y',
      { intervalMs: 1, timeoutMs: 1000 },
    );
    const err = await adapter.publish(baseCtx()).catch((e) => e);
    expect(err).toBeInstanceOf(AdapterError);
    expect(err.code).toBe('fb.4');
    expect(err.retryable).toBe(true);
  });
});

describe('XAdapter (mocked)', () => {
  it('runs INIT -> APPEND -> FINALIZE -> tweet', async () => {
    const http = axios.create();
    const mock = new MockAdapter(http);
    mock.onPost(/upload\.twitter\.com\/.*media\/upload\.json/).reply((config) => {
      // INIT/FINALIZE use params; APPEND is a multipart body with no params object.
      const cmd = (config.params ?? {}).command;
      if (cmd === 'INIT') return [200, { media_id_string: 'm_1' }];
      if (cmd === 'FINALIZE') return [200, { processing_info: { state: 'succeeded' } }];
      return [200, ''];
    });
    mock.onGet(/upload\.twitter\.com\/.*media\/upload\.json/).reply(200, { processing_info: { state: 'succeeded' } });
    mock.onPost('https://api.twitter.com/2/tweets').reply(200, { data: { id: 't_1' } });

    const adapter = new XAdapter(http);
    const ctx = baseCtx({
      localMediaPath: makeFakeMedia(2048),
      meta: fakeMeta({ durationSec: 30 }),
    });
    const res = await adapter.publish(ctx);
    expect(res.remoteId).toBe('t_1');
    expect(res.remoteUrl).toContain('x.com/i/status/t_1');
  });

  it('rejects videos longer than 140s', async () => {
    const adapter = new XAdapter(axios.create());
    await expect(
      adapter.publish(baseCtx({ meta: fakeMeta({ durationSec: 200 }) })),
    ).rejects.toMatchObject({ code: 'x.duration_exceeded', retryable: false });
  });
});
