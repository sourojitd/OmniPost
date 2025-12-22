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

import { useState } from 'react';
import useSWR from 'swr';
import { Copy, KeyRound, Trash2, Webhook } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api, fetcher } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string | null;
  scopes: string[];
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function DeveloperPage() {
  const { data, mutate } = useSWR<ApiKey[]>('/api-keys', fetcher);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('posts:write');
  const [justCreated, setJustCreated] = useState<{ key: string; id: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  const create = async () => {
    const res = await api<{ id: string; key: string }>(`/api-keys`, {
      method: 'POST',
      body: JSON.stringify({
        name: name || undefined,
        scopes: scopes.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    setJustCreated({ key: res.key, id: res.id });
    setName('');
    mutate();
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this key? It cannot be undone.')) return;
    await api(`/api-keys/${id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Developer</h1>
        <p className="text-sm text-white/60">
          Create API keys and configure webhooks for delivery notifications.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={16} /> API keys
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder="Key name (e.g. CI server)" value={name}
              onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Scopes, comma-separated" value={scopes}
              onChange={(e) => setScopes(e.target.value)} />
            <Button onClick={create}>Generate</Button>
          </div>

          {justCreated && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-200">
                Copy this key now — it will not be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="block flex-1 truncate rounded bg-black/40 px-2 py-1 font-mono text-xs">
                  {justCreated.key}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(justCreated.key)}
                >
                  <Copy size={14} /> Copy
                </Button>
              </div>
            </div>
          )}

          {data && data.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {data.map((k) => (
                <li key={k.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{k.name ?? '(unnamed)'}</p>
                    <p className="text-xs text-white/50 font-mono">{k.keyPrefix}…</p>
                    <p className="text-xs text-white/40">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt && ` · used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {k.scopes.length > 0 && (
                      <div className="hidden sm:flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} variant="brand">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {k.revokedAt ? (
                      <Badge variant="muted">revoked</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revoke(k.id)}
                        className="text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 size={14} /> Revoke
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50">No API keys yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook size={16} /> Webhooks
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-white/60">
            We POST delivery events to your endpoint with an{' '}
            <code className="font-mono">X-OmniPost-Signature</code> HMAC-SHA256 header.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://yourapp.com/webhooks/omnipost"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <Button disabled>Save (coming soon)</Button>
          </div>
          <p className="text-xs text-white/40">
            Subscribed events: <code>post.published</code>, <code>post.failed</code>,
            <code> post.dead_letter</code>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
