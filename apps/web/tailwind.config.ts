/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * Original author & rights holder: Sourojit Dhua. Reattribution requires the
 * rights holder's authorization; third parties cannot reassign it.
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#08080d',
          800: '#0d0d14',
          700: '#13131c',
          600: '#1a1a26',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
        },
        cyan: {
          400: '#22d3ee',
        },
        pink: {
          400: '#f472b6',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'aurora':
          'radial-gradient(at 20% 20%, rgba(124,58,237,0.35) 0px, transparent 50%), radial-gradient(at 80% 10%, rgba(34,211,238,0.25) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(244,114,182,0.25) 0px, transparent 50%)',
        'grid':
          'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
      keyframes: {
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(10px)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'spin-reverse': {
          to: { transform: 'rotate(-360deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', filter: 'blur(28px)' },
          '50%': { opacity: '1', filter: 'blur(36px)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'beam': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'dash': {
          to: { strokeDashoffset: '-200' },
        },
        'orbit': {
          from: { transform: 'rotate(0deg) translateX(54px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(54px) rotate(-360deg)' },
        },
        'noise': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-1%,-1%)' },
          '20%': { transform: 'translate(1%,1%)' },
          '30%': { transform: 'translate(-1%,1%)' },
          '40%': { transform: 'translate(1%,-1%)' },
          '50%': { transform: 'translate(-2%,0)' },
          '60%': { transform: 'translate(2%,0)' },
          '70%': { transform: 'translate(0,1%)' },
          '80%': { transform: 'translate(0,-1%)' },
          '90%': { transform: 'translate(-1%,0)' },
        },
      },
      animation: {
        'float-y': 'float-y 6s ease-in-out infinite',
        'float-x': 'float-x 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        'spin-reverse': 'spin-reverse 30s linear infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'beam': 'beam 3s linear infinite',
        'dash': 'dash 6s linear infinite',
        'noise': 'noise 1s steps(8) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
