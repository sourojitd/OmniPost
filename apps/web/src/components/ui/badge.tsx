/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'success' | 'warn' | 'error' | 'muted' | 'brand';

const tones: Record<Variant, string> = {
  success: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
  warn: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
  error: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40',
  muted: 'bg-white/10 text-white/70 ring-1 ring-white/15',
  brand: 'bg-brand-500/15 text-brand-100 ring-1 ring-brand-500/40',
};

export function Badge({
  variant = 'muted',
  className,
  children,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tones[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
