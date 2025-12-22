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
import { Logo } from '@/components/Logo';

const COLS = [
  {
    title: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#how', label: 'How it works' },
      { href: '#platforms', label: 'Platforms' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { href: '#developers', label: 'Quick start' },
      { href: '/dashboard/developer', label: 'API keys' },
      { href: '#', label: 'Webhooks' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '#', label: 'About' },
      { href: '#', label: 'Status' },
      { href: '#', label: 'Privacy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 px-6 py-14 text-sm text-white/60">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-[1.4fr_repeat(3,_1fr)]">
        <div>
          <Logo size={28} />
          <p className="mt-3 max-w-xs text-white/55">
            Open-source unified publishing engine for video creators and the
            apps that serve them.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {col.title}
            </h4>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/45">
        <span>© {new Date().getFullYear()} OmniPost · MIT licensed</span>
        <span className="font-mono">build · v0.1.0</span>
      </div>
    </footer>
  );
}
