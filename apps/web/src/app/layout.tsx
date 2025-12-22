/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import type { Metadata, Viewport } from 'next';
import { OMNIPOST_AUTHOR, OMNIPOST_COPYRIGHT } from '@omnipost/types';
import './globals.css';

export const metadata: Metadata = {
  title: 'OmniPost — one post, every platform',
  description:
    'Open-source publishing engine that smart-transcodes, chunk-uploads, and fan-outs a single video to YouTube, Instagram, Facebook, and X.',
  applicationName: 'OmniPost',
  authors: [{ name: OMNIPOST_AUTHOR }],
  creator: OMNIPOST_AUTHOR,
  publisher: OMNIPOST_AUTHOR,
  // Emits <meta name="copyright"> and <meta name="author"> into every page.
  other: { author: OMNIPOST_AUTHOR, copyright: OMNIPOST_COPYRIGHT },
  openGraph: {
    title: 'OmniPost',
    description: 'One post. Every platform. Zero compromise.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#08080d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Authorship watermark — OmniPost © Sourojit Dhua (sig:U291cm9qaXQgRGh1YQ==) */}
        <meta name="author" content={OMNIPOST_AUTHOR} />
        <meta name="copyright" content={OMNIPOST_COPYRIGHT} />
      </head>
      <body className="font-sans antialiased">
        {/* OmniPost is authored by Sourojit Dhua. Retain attribution — see LICENSE. */}
        {children}
      </body>
    </html>
  );
}
