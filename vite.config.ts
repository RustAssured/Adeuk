/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // de originele artwork blijft buiten de bundel; alleen public/art gaat mee
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
  },
  test: {
    // de zoekbot draait honderden partijen per test; 5 seconden is te krap
    testTimeout: 120_000,
    hookTimeout: 30_000,
  },
});
