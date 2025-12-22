/*!
 * OmniPost — unified social publishing engine
 * Author: Sourojit Dhua
 * Copyright (c) 2025 Sourojit Dhua. All rights reserved.
 * Licensed under the MIT License. Retain this notice (see LICENSE / AUTHORS).
 * @omnipost-attribution sig:U291cm9qaXQgRGh1YQ==
 */

// Flat ESLint config (ESLint 9 + typescript-eslint). Non-type-checked for
// speed — type errors are caught by `tsc` / `pnpm turbo run typecheck`. This
// lint focuses on real correctness smells, not style.
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
      'assets/**',
      // Config files are not application source; skip to avoid parser noise.
      '**/*.config.{js,cjs,mjs,ts}',
      '**/jest*.config.*',
      '**/next-env.d.ts',
    ],
  },

  // TypeScript / TSX application + package source.
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['apps/**/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
  })),
  {
    files: ['apps/**/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // `as any` is used deliberately in a few well-commented spots.
      '@typescript-eslint/no-explicit-any': 'off',
      // require() is used intentionally for optional native bins (ffmpeg).
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Node tooling scripts (ESM).
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
);
