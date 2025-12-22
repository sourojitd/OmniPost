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
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

/**
 * Hero — three layers:
 *  1) Mouse-follow spotlight on the whole section.
 *  2) The big animated logo, floating + orbiting platform glyphs around it.
 *  3) Headline + sub + CTA, with a staggered fade-in via Framer Motion.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      });
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden px-6 pt-32 pb-20 sm:pt-40"
    >
      {/* Spotlight that follows the cursor. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 transition-opacity"
        style={{
          background: `radial-gradient(600px 600px at ${pos.x}% ${pos.y}%, rgba(124,58,237,0.18), transparent 60%)`,
        }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-white/80"
          >
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            v0.1 — open source · API-first
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
            className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="text-gradient animate-gradient-x">One post.</span>
            <br />
            <span className="text-white">Every platform.</span>
            <br />
            <span className="text-white/80">Zero compromise.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/70"
          >
            OmniPost is the open-source publishing engine that smart-transcodes,
            chunked-uploads, and fan-outs a single video to YouTube, Instagram,
            Facebook, and X — with a strict dead-letter queue so one failure
            never blocks the rest.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-900 transition-transform hover:scale-[1.03]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start publishing
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/60 blur-md animate-shimmer" />
            </Link>
            <a
              href="#features"
              className="glass inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-white/85 transition-colors hover:bg-white/[0.07]"
            >
              <Sparkles size={14} className="text-brand-300" />
              See what's inside
            </a>
          </motion.div>

          {/* Stat bar */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            className="glass mt-10 grid grid-cols-3 divide-x divide-white/10 rounded-2xl"
          >
            <Stat value="4" unit="platforms" />
            <Stat value="≤140s" unit="X video" />
            <Stat value="100MB+" unit="chunked uploads" />
          </motion.div>
        </div>

        {/* Right: the showpiece */}
        <HeroVisual />
      </div>
    </section>
  );
}

function Stat({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="text-xl font-semibold text-white sm:text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-wider text-white/50">{unit}</div>
    </div>
  );
}

/**
 * The right-hand visual: a giant animated logo with the four platform glyphs
 * floating around it on independent timings. The whole composition is wrapped
 * in a glass disc so it reads as a hero subject, not background.
 */
function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
      className="relative mx-auto aspect-square w-full max-w-[520px]"
    >
      {/* Outer halo disc */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-600/30 via-pink-400/10 to-cyan-400/20 blur-2xl" />
      <div className="glass-strong absolute inset-6 rounded-full" />
      <div className="absolute inset-12 rounded-full border border-white/5" />
      <div className="absolute inset-20 rounded-full border border-dashed border-white/10 animate-spin-slow" />

      {/* Concentric platform glyphs */}
      {GLYPHS.map((g, i) => (
        <FloatingGlyph key={g.label} {...g} index={i} />
      ))}

      {/* Center logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-[-30%] rounded-full bg-brand-500/40 blur-3xl animate-pulse-glow" />
          <LogoMark size={220} />
        </div>
      </div>

      {/* Light beam streak across center */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden">
        <div className="beam-strip h-px w-full animate-beam" />
      </div>
      <Zap
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-white/30"
        size={18}
      />
    </motion.div>
  );
}

const GLYPHS = [
  { label: 'YouTube', glyph: '▶', color: '#ff3b3b', x: '6%', y: '14%', delay: 0 },
  { label: 'Instagram', glyph: '◎', color: '#e1306c', x: '88%', y: '22%', delay: 0.6 },
  { label: 'X', glyph: '𝕏', color: '#ffffff', x: '6%', y: '74%', delay: 1.2 },
  { label: 'Facebook', glyph: 'f', color: '#1877f2', x: '86%', y: '72%', delay: 1.8 },
];

function FloatingGlyph({
  label,
  glyph,
  color,
  x,
  y,
  index,
  delay,
}: (typeof GLYPHS)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, x: 12 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.4 + index * 0.15, ease: 'easeOut' }}
      className="absolute"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="glass-strong relative flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold animate-float-y"
        style={{ animationDelay: `${delay}s`, color }}
        title={label}
      >
        <span
          className="absolute inset-0 rounded-2xl opacity-30 blur-md"
          style={{ background: color }}
        />
        <span className="relative">{glyph}</span>
      </div>
    </motion.div>
  );
}
