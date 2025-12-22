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
import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';

interface SocialAccount {
  id: string;
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'X';
  handle: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  tokenExpiresAt: string | null;
}

interface Post {
  id: string;
  caption: string;
  status: string;
  createdAt: string;
  deliveryLogs: { platform: string; status: string; remoteUrl?: string | null }[];
}

const statusVariant: Record<string, 'success' | 'warn' | 'error' | 'muted' | 'brand'> = {
  ACTIVE: 'success',
  COMPLETED: 'success',
  PUBLISHED: 'success',
  PARTIAL: 'warn',
  PROCESSING: 'brand',
  QUEUED: 'brand',
  UPLOADING: 'brand',
  PENDING: 'muted',
  EXPIRED: 'warn',
  ERROR: 'error',
  FAILED: 'error',
  DEAD_LETTER: 'error',
  REVOKED: 'muted',
};

export default function OverviewPage() {
  const accounts = useSWR<SocialAccount[]>('/social-accounts', fetcher);
  const posts = useSWR<Post[]>('/posts', fetcher);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-white/60">Your connected accounts and recent activity.</p>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Connected accounts</CardTitle>
          <Link href="/dashboard/connections">
            <Button variant="secondary" size="sm">Manage</Button>
          </Link>
        </CardHeader>
        <CardBody>
          {accounts.error && (
            <p className="text-sm text-rose-400">Failed to load accounts: {String(accounts.error)}</p>
          )}
          {!accounts.data && !accounts.error && <p className="text-sm text-white/50">Loading…</p>}
          {accounts.data && accounts.data.length === 0 && (
            <p className="text-sm text-white/60">
              No accounts connected yet.{' '}
              <Link className="text-brand-300 hover:underline" href="/dashboard/connections">
                Connect one
              </Link>
              .
            </p>
          )}
          {accounts.data && accounts.data.length > 0 && (
            <ul className="divide-y divide-white/5">
              {accounts.data.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.platform}</p>
                    <p className="text-xs text-white/50">{a.handle ?? '—'}</p>
                  </div>
                  <Badge variant={statusVariant[a.status] ?? 'muted'}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent posts</CardTitle>
        </CardHeader>
        <CardBody>
          {!posts.data && !posts.error && <p className="text-sm text-white/50">Loading…</p>}
          {posts.data && posts.data.length === 0 && (
            <p className="text-sm text-white/60">No posts yet.</p>
          )}
          {posts.data && posts.data.length > 0 && (
            <ul className="divide-y divide-white/5">
              {posts.data.map((p) => (
                <li key={p.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.caption || '(no caption)'}</p>
                    <p className="text-xs text-white/50">
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.deliveryLogs.map((d, i) => (
                        <Badge key={i} variant={statusVariant[d.status] ?? 'muted'}>
                          {d.platform}: {d.status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant={statusVariant[p.status] ?? 'muted'}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
