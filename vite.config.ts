import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // story-trial.html: the animated-page trial for the parent (2026-10-08), outside the app; index.html is the app
  build: { rollupOptions: { input: { main: 'index.html', trial: 'story-trial.html' } } },
  // fsrs-browser's thread helper (wasm-bindgen-rayon) is a module worker; the app never starts its thread pool, but it must build
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['fsrs-browser'] }, // pre-bundled, its .wasm URL (new URL(…, import.meta.url)) would point nowhere in dev
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt', // src/pwa.ts applies updates on Home, never mid-session
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '字己 ZiJi',
        short_name: 'ZiJi',
        description: 'Daily Chinese character practice with Truffle 松露, a grumpy cat',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fbf6ea',
        theme_color: '#fbf6ea',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}', 'worlds/*.webp'], // One River's paintings and thumbnails: the worlds work offline (spec 2026-10-13 §4)
        // the FSRS optimizer (SRS tuning spec §6.2) loads only when the parent taps Fit: never precached, runtime-cached below
        globIgnores: ['**/fsrs_browser*', '**/workerHelpers*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/(fsrs_browser|workerHelpers)[^/]*\.(js|wasm)$/.test(url.pathname),
            handler: 'CacheFirst', // hashed names: a new build is a new URL
            options: { cacheName: 'optimizer', expiration: { maxEntries: 8 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/hanzi-writer-data@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stroke-data',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/clips/'),
            handler: 'CacheFirst', // a clip never changes: its name is its content
            options: { cacheName: 'clips', expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 60 * 24 * 180 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/audio/index.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'clip-index', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // fsrs-browser names only a browser "module" entry, which vitest's resolver skips; the optimizer itself runs in WebKit (scripts/optimizer-check.ts)
    alias: { 'fsrs-browser': fileURLToPath(new URL('./node_modules/fsrs-browser/fsrs_browser.js', import.meta.url)) },
    testTimeout: 20_000, // the placement and first-launch walks answer 30–40 questions; a loaded machine (or CI) can pass 5 s
  },
});
