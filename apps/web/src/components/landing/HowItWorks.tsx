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
import { Cpu, FileVideo, Send, Workflow } from 'lucide-react';
import { SectionHeader } from './Features';

const STEPS = [
  {
    n: '01',
    icon: FileVideo,
    title: 'Upload once',
    body: 'Your client requests a presigned URL and PUTs the video directly to S3 — no API proxy, no 100MB Lambda ceiling.',
  },
  {
    n: '02',
    icon: Cpu,
    title: 'Probe + adapt',
    body: 'A BullMQ worker probes the file, picks per-platform target shapes, and renders a blurred-pad copy only when needed.',
  },
  {
    n: '03',
    icon: Workflow,
    title: 'Fan out, isolate',
    body: 'One job per platform. YouTube failing never blocks Instagram. Each delivery has its own status row in your DB.',
  },
  {
    n: '04',
    icon: Send,
    title: 'Publish + permalink',
    body: 'Adapters speak each platform’s native upload protocol. The published URL flows back to you via webhook or polling.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Architecture"
          title={
            <>
              From one upload to{' '}
              <span className="text-gradient animate-gradient-x">four platforms</span>{' '}
              in four steps
            </>
          }
          sub="A decoupled pipeline: clients never wait for transcodes, the API never holds bytes, and the worker never blocks one platform on another."
        />

        {/* Fan-out illustration */}
        <FanOutDiagram />

        {/* Step cards */}
        <ol className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="glass relative overflow-hidden rounded-2xl p-5"
            >
              <div className="absolute right-4 top-3 font-mono text-xs text-white/30">
                {s.n}
              </div>
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/80">
                <s.icon size={16} />
              </div>
              <h4 className="text-base font-semibold text-white">{s.title}</h4>
              <p className="mt-1.5 text-sm text-white/65">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * SVG fan-out diagram. A central source node with four arcing paths to
 * platform nodes; each path has a moving "packet" along it (animateMotion).
 * Reduced-motion users see static paths thanks to the global media query.
 */
function FanOutDiagram() {
  const platforms = [
    { x: 80, y: 50, color: '#ff3b3b', label: 'YT' },
    { x: 80, y: 130, color: '#e1306c', label: 'IG' },
    { x: 80, y: 210, color: '#1877f2', label: 'FB' },
    { x: 80, y: 290, color: '#ffffff', label: 'X' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="glass relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl p-6"
    >
      <svg viewBox="-560 0 1120 340" className="h-72 w-full">
        <defs>
          <linearGradient id="path-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(124,58,237,0.0)" />
            <stop offset="50%" stopColor="rgba(124,58,237,0.7)" />
            <stop offset="100%" stopColor="rgba(244,114,182,0.9)" />
          </linearGradient>
          <radialGradient id="src-grad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#7c3aed" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Source node on the left */}
        <g transform="translate(-440 170)">
          <circle r="44" fill="rgba(124,58,237,0.15)" />
          <circle r="28" fill="url(#src-grad)" />
          <text
            y="74"
            textAnchor="middle"
            className="fill-white/70 text-[12px]"
            style={{ fontFamily: 'ui-monospace' }}
          >
            your upload
          </text>
        </g>

        {/* Curved paths to each platform */}
        {platforms.map((p, i) => {
          const d = `M -396 170 C -120 170, -40 ${p.y}, 60 ${p.y}`;
          return (
            <g key={p.label}>
              <path
                d={d}
                fill="none"
                stroke="url(#path-grad)"
                strokeWidth="1.4"
                strokeDasharray="4 6"
                className="animate-dash"
                style={{ animationDelay: `${i * 0.4}s` }}
                opacity="0.7"
              />
              {/* Glowing packet that runs along the path. */}
              <circle r="4" fill={p.color} filter="url(#soft)">
                <animateMotion
                  dur={`${4 + i * 0.5}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.6}s`}
                  path={d}
                />
              </circle>
              <circle r="2" fill="#ffffff">
                <animateMotion
                  dur={`${4 + i * 0.5}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.6}s`}
                  path={d}
                />
              </circle>

              {/* Platform endpoint */}
              <g transform={`translate(${p.x} ${p.y})`}>
                <circle r="22" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
                <circle r="10" fill={p.color} opacity="0.9" filter="url(#soft)" />
                <text
                  x="36"
                  y="5"
                  className="fill-white/70 text-[12px]"
                  style={{ fontFamily: 'ui-monospace' }}
                >
                  {p.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Caption */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/60">
        <span className="font-mono">POST /v1/posts → 1 BullMQ job per target</span>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
          isolated · idempotent · retryable
        </span>
      </div>
    </motion.div>
  );
}
