'use client';
/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import useSWR from 'swr';
import { Youtube, Instagram, Twitter, Plug, PlugZap } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, fetcher } from '@/lib/api';

interface SocialAccount {
  id: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  handle: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  tokenExpiresAt: string | null;
}

const PROVIDERS: {
  key: 'youtube' | 'meta' | 'x';
  label: string;
  platforms: SocialAccount['platform'][];
  icon: React.ElementType;
  description: string;
}[] = [
  {
    key: 'youtube',
    label: 'YouTube',
    platforms: ['YOUTUBE'],
    icon: Youtube,
    description: 'Upload Shorts and longform videos to your channel.',
  },
  {
    key: 'meta',
    label: 'Meta (Instagram + Facebook)',
    platforms: ['INSTAGRAM', 'FACEBOOK'],
    icon: Instagram,
    description: 'Publish Reels to Instagram and Reels/posts to Facebook Pages.',
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    platforms: ['X'],
    icon: Twitter,
    description: 'Post tweets with chunked video upload (≤140s).',
  },
];

export default function ConnectionsPage() {
  const { data, error, mutate } = useSWR<SocialAccount[]>('/social-accounts', fetcher);

  const startOAuth = async (provider: string) => {
    try {
      const r = await api<{ authorizeUrl: string }>(`/oauth/${provider}/start`);
      window.location.href = r.authorizeUrl;
    } catch (e) {
      alert(`Could not start OAuth: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm('Disconnect this account?')) return;
    await api(`/social-accounts/${id}`, { method: 'DELETE' });
    mutate();
  };

  const accountsByPlatform = (p: SocialAccount['platform']) =>
    (data ?? []).filter((a) => a.platform === p);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="text-sm text-white/60">
          Authorize OmniPost to publish on your behalf. Tokens are encrypted at rest with AES-256-GCM.
        </p>
      </header>

      {error && <p className="text-sm text-rose-400">Failed to load connections.</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const accounts = p.platforms.flatMap(accountsByPlatform);
          const anyActive = accounts.some((a) => a.status === 'ACTIVE');
          return (
            <Card key={p.key}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-brand-300" />
                  <CardTitle>{p.label}</CardTitle>
                </div>
                {anyActive ? (
                  <Badge variant="success">
                    <PlugZap size={12} className="mr-1" /> connected
                  </Badge>
                ) : (
                  <Badge variant="muted">
                    <Plug size={12} className="mr-1" /> not connected
                  </Badge>
                )}
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-white/60">{p.description}</p>
                {accounts.length > 0 && (
                  <ul className="space-y-2">
                    {accounts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{a.handle ?? a.platform}</p>
                          <p className="text-xs text-white/50">
                            {a.tokenExpiresAt
                              ? `expires ${new Date(a.tokenExpiresAt).toLocaleString()}`
                              : 'no expiry'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              a.status === 'ACTIVE'
                                ? 'success'
                                : a.status === 'EXPIRED'
                                  ? 'warn'
                                  : 'error'
                            }
                          >
                            {a.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => disconnect(a.id)}
                            className="text-rose-300 hover:bg-rose-500/10"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button onClick={() => startOAuth(p.key)} className="w-full">
                  {accounts.length > 0 ? `Add another ${p.label} account` : `Connect ${p.label}`}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
