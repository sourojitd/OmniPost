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

import { motion } from 'framer-motion';
import { Layers, ShieldCheck, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Layers,
    title: 'Smart Aspect-Ratio Guard',
    body: 'Horizontal video bound for Reels or Shorts gets a Spotify-style blurred-background pad instead of being rejected. Subject stays centered, reach goes up.',
    accent: 'from-brand-500 to-pink-400',
    bullet: 'FFmpeg filter_complex · σ=18 Gaussian',
  },
  {
    icon: Workflow,
    title: 'Chunked Resumable Uploads',
    body: 'Files over 100 MB switch to S3 presigned multipart automatically. Lose your wifi mid-upload? Resume from the last completed part — no re-encode, no retry-from-zero.',
    accent: 'from-cyan-400 to-brand-500',
    bullet: '16 MiB parts · S3 / MinIO',
  },
  {
    icon: ShieldCheck,
    title: 'Strict DLQ + Backoff',
    body: 'Each platform delivery is isolated. Failures get exponential backoff with full jitter, persisted in your DB, retried by an idempotent scanner — never blocking the other three.',
    accent: 'from-pink-400 to-cyan-400',
    bullet: 'CAS claim · 8 attempts · 1h cap',
  },
] as const;

export function Features() {
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="What makes it different"
          title={
            <>
              Three things competitors{' '}
              <span className="text-gradient animate-gradient-x">don't get right</span>
            </>
          }
          sub="Most schedulers proxy your file, reject the wrong aspect ratio, and treat a single 429 as the end of the world. OmniPost is built for the failure modes you'll actually hit."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={cn('mx-auto max-w-3xl', align === 'center' && 'text-center')}>
      {eyebrow && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="glass mb-4 inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70"
        >
          {eyebrow}
        </motion.div>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl"
      >
        {title}
      </motion.h2>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mt-4 text-pretty text-base text-white/70 sm:text-lg"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Glass card with a spotlight that follows the cursor, a subtle scale on hover,
 * and a gradient bottom strip in the feature's accent colors.
 */
function FeatureCard({
  icon: Icon,
  title,
  body,
  accent,
  bullet,
  delay,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: string;
  bullet: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setPos(null)}
      className="group relative overflow-hidden rounded-3xl"
    >
      <div className="glass gradient-border h-full rounded-3xl p-6 transition-transform duration-300 group-hover:-translate-y-1">
        {/* Cursor spotlight */}
        {pos && (
          <div
            className="pointer-events-none absolute inset-0 opacity-100 transition-opacity"
            style={{
              background: `radial-gradient(360px 360px at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.08), transparent 60%)`,
            }}
          />
        )}

        <div className={cn('mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', accent)}>
          <Icon size={20} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{body}</p>

        <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/55">
          <span className={cn('h-1.5 w-1.5 rounded-full bg-gradient-to-r', accent)} />
          <span className="font-mono">{bullet}</span>
        </div>

        {/* Bottom accent bar */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r opacity-60',
            accent,
          )}
        />
      </div>
    </motion.div>
  );
}
