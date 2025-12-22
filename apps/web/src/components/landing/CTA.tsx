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
import { ArrowRight, Github, Sparkles } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

export function CTA() {
  return (
    <section className="relative px-6 pb-32 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="glass-strong relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-8 py-16 text-center sm:px-16"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-30" />

        <div className="relative">
          <div className="flex justify-center">
            <LogoMark size={72} />
          </div>

          <h2 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Ship the post.{' '}
            <span className="text-gradient animate-gradient-x">Not the plumbing.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-white/70 sm:text-lg">
            Spin up the whole stack in 60 seconds. MIT licensed, BYO database,
            BYO S3 — or run it on the OmniPost cloud.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-900 transition-transform hover:scale-[1.03]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Create your account
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/60 blur-md animate-shimmer" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="glass inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm text-white/85 transition-colors hover:bg-white/[0.07]"
            >
              <Github size={14} />
              Star on GitHub
            </a>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-white/60">
            <Sparkles size={12} className="text-brand-300" />
            No credit card · self-host friendly
          </div>
        </div>
      </motion.div>
    </section>
  );
}
