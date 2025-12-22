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

import { cn } from '@/lib/utils';

/**
 * OmniPost logo — a stylized "O" that represents a single payload fanning out
 * to multiple platforms.
 *
 * Construction:
 *   - An outer dashed ring slowly rotates (motion = "always sending").
 *   - A counter-rotating inner ring with a brighter gradient stroke.
 *   - Four orbital nodes at 0°/90°/180°/270° colored after the four platforms.
 *   - A central diamond that pulses (the post itself).
 *   - A soft conic halo bleeds behind the whole mark.
 *
 * Sized by the `size` prop (default 56). The wordmark is a separate sibling
 * so it can be hidden on mobile while the icon stays visible.
 */
export function LogoMark({
  size = 56,
  className,
  animated = true,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const stroke = 'url(#opGrad)';
  return (
    <div
      className={cn('relative inline-block', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Soft halo behind the mark. */}
      <div
        className={cn(
          'absolute inset-[-22%] rounded-full conic-ring opacity-70',
          animated && 'animate-spin-slow',
        )}
        style={{ filter: 'blur(14px)' }}
      />

      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative"
        fill="none"
      >
        <defs>
          <linearGradient id="opGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="opGradInner" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <radialGradient id="opCore" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f472b6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <filter id="opGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer dashed ring — slowly rotates. */}
        <g
          className={cn(animated && 'animate-spin-slow origin-center')}
          style={{ transformOrigin: '32px 32px' }}
        >
          <circle
            cx="32"
            cy="32"
            r="26"
            stroke={stroke}
            strokeWidth="1.4"
            strokeDasharray="4 6"
            opacity="0.7"
          />
        </g>

        {/* Inner solid ring — counter-rotates. */}
        <g
          className={cn(animated && 'animate-spin-reverse origin-center')}
          style={{ transformOrigin: '32px 32px' }}
        >
          <circle
            cx="32"
            cy="32"
            r="19"
            stroke="url(#opGradInner)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="80 200"
            filter="url(#opGlow)"
          />
        </g>

        {/* Four platform-colored orbital nodes. */}
        <g
          className={cn(animated && 'animate-spin-slow origin-center')}
          style={{ transformOrigin: '32px 32px' }}
        >
          {/* YouTube red */}
          <circle cx="32" cy="6" r="3" fill="#ff3b3b" filter="url(#opGlow)" />
          {/* Instagram pink */}
          <circle cx="58" cy="32" r="3" fill="#e1306c" filter="url(#opGlow)" />
          {/* Facebook blue */}
          <circle cx="32" cy="58" r="3" fill="#1877f2" filter="url(#opGlow)" />
          {/* X white */}
          <circle cx="6" cy="32" r="3" fill="#ffffff" filter="url(#opGlow)" />
        </g>

        {/* Central diamond — the post itself, pulses. */}
        <g style={{ transformOrigin: '32px 32px' }}>
          <circle cx="32" cy="32" r="11" fill="url(#opCore)" />
          <g
            className={cn(animated && 'animate-pulse-glow origin-center')}
            style={{ transformOrigin: '32px 32px' }}
          >
            <rect
              x="27"
              y="27"
              width="10"
              height="10"
              rx="2.4"
              transform="rotate(45 32 32)"
              fill="url(#opGrad)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Wordmark beside the mark — `OmniPost` with a gradient on "Omni". */
export function Logo({
  size = 36,
  className,
  showWordmark = true,
  animated = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  animated?: boolean;
}) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark size={size} animated={animated} />
      {showWordmark && (
        <span className="text-xl font-semibold tracking-tight">
          <span className="text-gradient animate-gradient-x">Omni</span>
          <span className="text-white">Post</span>
        </span>
      )}
    </div>
  );
}
