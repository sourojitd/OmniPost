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
import { SectionHeader } from './Features';

const PLATFORMS = [
  {
    name: 'YouTube',
    accent: '#ff3b3b',
    glyph: '▶',
    desc: 'Resumable Data API v3 uploads. Auto-tagged #Shorts when under 60s and vertical.',
    chips: ['Shorts', 'Longform', 'Resumable'],
  },
  {
    name: 'Instagram',
    accent: '#e1306c',
    glyph: '◎',
    desc: 'Graph API REELS container flow with status polling and permalink resolution.',
    chips: ['Reels', 'Feed', 'Permalink'],
  },
  {
    name: 'Facebook',
    accent: '#1877f2',
    glyph: 'f',
    desc: 'Page-token publishing, container verification, and pageId discovery on connect.',
    chips: ['Reels', 'Pages', 'Page-token'],
  },
  {
    name: 'X (Twitter)',
    accent: '#ffffff',
    glyph: '𝕏',
    desc: 'OAuth2 + PKCE-S256. Chunked media: INIT → APPEND → FINALIZE with STATUS poll.',
    chips: ['OAuth2 · PKCE', 'Chunked', '≤140s'],
  },
];

export function Platforms() {
  return (
    <section id="platforms" className="relative px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Adapters"
          title={
            <>
              Native protocol per platform —{' '}
              <span className="text-gradient animate-gradient-x">no generic shims</span>
            </>
          }
          sub="Each adapter speaks the exact upload protocol the platform expects, surfaces real platform error codes, and self-refreshes tokens on a 401."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((p, i) => (
            <motion.article
              key={p.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="group glass relative overflow-hidden rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              {/* Accent halo on hover */}
              <div
                className="pointer-events-none absolute -top-16 right-[-30%] h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
                style={{ background: p.accent }}
              />

              <div
                className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-semibold"
                style={{
                  color: p.accent,
                  background: 'rgba(255,255,255,0.04)',
                  boxShadow: `inset 0 0 0 1px ${p.accent}33, 0 0 40px -10px ${p.accent}77`,
                }}
              >
                {p.glyph}
              </div>
              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65">{p.desc}</p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70"
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* Shimmer streak on hover */}
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="block h-full w-full beam-strip animate-shimmer" />
              </span>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
