import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

export default defineConfig({
  base: '/ChinTalk/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'ChinTalk',
        short_name: 'ChinTalk',
        lang: 'ko',
        start_url: '/ChinTalk/#/',
        scope: '/ChinTalk/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0f766e',
        icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // 앱 셸 + vol1/meta JSON만 precache (§10.1). vol2~8은 런타임 캐시.
        globPatterns: ['**/*.{js,css,html,svg}', 'data/lessons-vol1.json', 'data/lessons-meta.json'],
        runtimeCaching: [
          {
            // 재생한 mp3는 캐시 → 다음부터 오프라인 재생 (precache 제외, §10)
            urlPattern: /\/tts\/[0-9a-f]+\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tts-audio',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 6000 },
            },
          },
          {
            urlPattern: /\/data\/zh-tts-manifest\.json$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'tts-manifest' },
          },
          {
            urlPattern: /\/data\/lessons-vol[2-8]\.json$/,
            handler: 'CacheFirst',
            options: { cacheName: 'lessons-data', expiration: { maxEntries: 8 } },
          },
        ],
      },
    }),
  ],
});
