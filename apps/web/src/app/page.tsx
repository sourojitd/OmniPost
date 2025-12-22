/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import { Background } from '@/components/landing/Background';
import { CTA } from '@/components/landing/CTA';
import { CodeShowcase } from '@/components/landing/CodeShowcase';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Nav } from '@/components/landing/Nav';
import { Platforms } from '@/components/landing/Platforms';

export default function Home() {
  return (
    <main className="relative isolate">
      <Background />
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Platforms />
      <CodeShowcase />
      <CTA />
      <Footer />
    </main>
  );
}
