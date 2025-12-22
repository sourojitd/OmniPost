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


/**
 * Site-wide animated backdrop:
 *  - Faint pinned grid that fades top→bottom (anchors the page).
 *  - Three aurora blobs in brand/cyan/pink that drift on staggered timings.
 *  - A noise overlay to break up flat gradients (gives the page tactility).
 *
 * Pointer-events:none on every layer so it never steals input.
 */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 bg-grid opacity-[0.5]"
        style={{
          maskImage:
            'radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%)',
        }}
      />

      {/* Aurora blobs */}
      <div
        className="aurora-blob animate-float-y"
        style={{
          width: 620,
          height: 620,
          top: '-10%',
          left: '-10%',
          background:
            'radial-gradient(circle at 30% 30%, #7c3aed 0%, transparent 60%)',
        }}
      />
      <div
        className="aurora-blob animate-float-x"
        style={{
          width: 540,
          height: 540,
          top: '20%',
          right: '-12%',
          background:
            'radial-gradient(circle at 50% 50%, #22d3ee 0%, transparent 60%)',
          opacity: 0.4,
          animationDelay: '1.2s',
        }}
      />
      <div
        className="aurora-blob animate-float-y"
        style={{
          width: 700,
          height: 700,
          bottom: '-30%',
          left: '20%',
          background:
            'radial-gradient(circle at 50% 50%, #f472b6 0%, transparent 60%)',
          opacity: 0.35,
          animationDelay: '2.4s',
        }}
      />

      {/* SVG noise — adds a subtle film grain look. */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.035] mix-blend-overlay"
        aria-hidden
      >
        <filter id="bg-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" />
      </svg>
    </div>
  );
}
