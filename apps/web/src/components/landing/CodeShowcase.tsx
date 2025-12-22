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
import { useState } from 'react';
import { Terminal } from 'lucide-react';
import { SectionHeader } from './Features';
import { cn } from '@/lib/utils';

const TABS = [
  {
    key: 'curl',
    label: 'cURL',
    code: `# 1) Request an upload-intent
curl -X POST https://api.omnipost.dev/v1/media/upload-intent \\
  -H "Authorization: Bearer op_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "filename": "clip.mp4", "mimeType": "video/mp4", "sizeBytes": 84230112 }'

# 2) PUT the bytes straight to S3 (or upload parts for >100MB)
curl -T clip.mp4 "$PRESIGNED_URL"

# 3) Submit the post — fan-out begins immediately
curl -X POST https://api.omnipost.dev/v1/posts \\
  -H "Authorization: Bearer op_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "caption": "Behind the scenes ✂️",
    "mediaS3Key": "u/usr_42/1719240000-aBc.mp4",
    "mediaMimeType": "video/mp4",
    "targetPlatforms": ["YOUTUBE","INSTAGRAM","FACEBOOK","X"],
    "idempotencyKey": "post-2024-06-24-001"
  }'`,
  },
  {
    key: 'ts',
    label: 'TypeScript',
    code: `import { OmniPost } from '@omnipost/sdk';

const op = new OmniPost({ apiKey: process.env.OMNIPOST_KEY! });

// 1) Mint a presigned URL + stream the file to S3.
const { key } = await op.media.uploadFile('./clip.mp4');

// 2) Hand the key to OmniPost; the worker handles the rest.
const post = await op.posts.create({
  caption: 'Behind the scenes ✂️',
  mediaS3Key: key,
  mediaMimeType: 'video/mp4',
  targetPlatforms: ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'X'],
  idempotencyKey: 'post-2024-06-24-001',
});

// 3) Subscribe to delivery events.
op.webhooks.on('post.published', (evt) => {
  console.log(evt.platform, evt.remoteUrl);
});`,
  },
  {
    key: 'py',
    label: 'Python',
    code: `from omnipost import OmniPost

op = OmniPost(api_key=os.environ["OMNIPOST_KEY"])

key = op.media.upload_file("./clip.mp4")

post = op.posts.create(
    caption="Behind the scenes ✂️",
    media_s3_key=key,
    media_mime_type="video/mp4",
    target_platforms=["YOUTUBE", "INSTAGRAM", "FACEBOOK", "X"],
    idempotency_key="post-2024-06-24-001",
)

for delivery in op.posts.stream_deliveries(post.id):
    print(delivery.platform, delivery.status, delivery.remote_url)`,
  },
] as const;

export function CodeShowcase() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('ts');
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <section id="developers" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="For developers"
          title={
            <>
              Three calls.{' '}
              <span className="text-gradient animate-gradient-x">That's the whole API.</span>
            </>
          }
          sub="Presign, PUT, post. The hard parts — transcoding, retries, OAuth refresh — live in our worker and stay out of your code."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass-strong relative mt-12 overflow-hidden rounded-3xl"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="ml-2 flex items-center gap-2 text-xs text-white/50">
              <Terminal size={14} />
              omnipost — publish
            </div>
            <div className="ml-auto flex items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs transition-colors',
                    t.key === tab
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code */}
          <pre className="m-0 overflow-x-auto bg-transparent p-6 font-mono text-[13px] leading-relaxed text-white/85">
            <code>{colorize(active.code)}</code>
          </pre>

          {/* Soft side glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Tiny zero-dep syntax tinting: highlights keywords, strings, comments, and
 * numbers using JSX spans. Not a full tokenizer — just enough to make the
 * code feel alive without dragging in Shiki/Prism.
 */
function colorize(src: string): React.ReactNode {
  const lines = src.split('\n');
  const KW = /\b(const|let|var|import|from|export|new|await|async|for|in|return|if|else|true|false|null|undefined|class|os|environ|print|def)\b/g;
  return lines.map((line, i) => {
    let parts: React.ReactNode[] = [line];
    // comments
    const commentIdx = Math.min(
      ...[line.indexOf('//'), line.indexOf('#'), line.indexOf('--')]
        .filter((x) => x >= 0)
        .concat([line.length]),
    );
    if (commentIdx < line.length) {
      const before = line.slice(0, commentIdx);
      const comment = line.slice(commentIdx);
      parts = [
        applyTokens(before, KW),
        <span key="c" className="text-white/40">
          {comment}
        </span>,
      ];
    } else {
      parts = [applyTokens(line, KW)];
    }
    return (
      <span key={i}>
        {parts}
        {'\n'}
      </span>
    );
  });
}

function applyTokens(text: string, kw: RegExp): React.ReactNode {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  // strings
  const strRe = /(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g;
  let m: RegExpExecArray | null;
  const protectedRanges: [number, number, React.ReactNode][] = [];
  while ((m = strRe.exec(text)) !== null) {
    protectedRanges.push([
      m.index,
      m.index + m[0].length,
      <span key={`s${key++}`} className="text-emerald-300/90">
        {m[0]}
      </span>,
    ]);
  }
  // numbers
  const numRe = /\b\d[\d_]*(\.\d+)?\b/g;
  while ((m = numRe.exec(text)) !== null) {
    const inStr = protectedRanges.some(([a, b]) => m!.index >= a && m!.index < b);
    if (!inStr) {
      protectedRanges.push([
        m.index,
        m.index + m[0].length,
        <span key={`n${key++}`} className="text-amber-300/90">
          {m[0]}
        </span>,
      ]);
    }
  }
  protectedRanges.sort((a, b) => a[0] - b[0]);

  for (const [a, b, node] of protectedRanges) {
    if (a > i) out.push(highlightKeywords(text.slice(i, a), kw, key++));
    out.push(node);
    i = b;
  }
  if (i < text.length) out.push(highlightKeywords(text.slice(i), kw, key++));
  return out;
}

function highlightKeywords(text: string, kw: RegExp, baseKey: number): React.ReactNode {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  kw.lastIndex = 0;
  while ((m = kw.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span key={`k${baseKey}-${m.index}`} className="text-fuchsia-300">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
