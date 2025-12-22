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

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Cable, Code2, LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken, setToken } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/connections', label: 'Connections', icon: Cable },
  { href: '/dashboard/developer', label: 'Developer', icon: Code2 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const signOut = () => {
    setToken(null);
    router.replace('/login');
  };

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="border-r border-white/10 bg-black/40 p-4 flex flex-col gap-2">
        <Link href="/" className="px-2 py-3 text-lg font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-white to-brand-500 bg-clip-text text-transparent">
            OmniPost
          </span>
        </Link>
        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.href || (n.href !== '/dashboard' && path?.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-brand-600/30 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <main className="p-6 sm:p-8 max-w-6xl">{children}</main>
    </div>
  );
}
