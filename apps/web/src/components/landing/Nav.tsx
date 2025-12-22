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
import { useEffect, useState } from 'react';
import { Github } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#platforms', label: 'Platforms' },
  { href: '#developers', label: 'Developers' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-4 z-40 mx-auto flex justify-center px-4 transition-all duration-300',
        scrolled ? 'top-2' : 'top-4',
      )}
    >
      <nav
        className={cn(
          'glass-strong relative flex items-center justify-between gap-4 rounded-full px-3 py-2 pl-4 transition-all duration-300',
          'w-full max-w-4xl',
        )}
        style={{ backdropFilter: 'saturate(140%) blur(18px)' }}
      >
        <Link href="/" className="shrink-0">
          <Logo size={28} />
        </Link>
        <ul className="hidden items-center gap-1 text-sm text-white/70 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:flex"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-900 transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <span className="relative z-10">Get started</span>
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 blur-sm animate-shimmer" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
