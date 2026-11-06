import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';
import { readFileSync } from 'node:fs';

const audioFiles = new Set(['zh', 'ko'].flatMap((lang) => Object.values(
  JSON.parse(readFileSync(new URL(`./public/data/${lang}-tts-manifest.json`, import.meta.url), 'utf8')) as Record<string, string>,
)));

export default defineConfig({
  base: '/ChinTalk/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      // 새 버전을 미리 저장하고 모든 앱 창을 닫은 다음 실행 때 자동 적용한다.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon.svg'],
      manifest: {
        id: '/ChinTalk/',
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
        // 전권 교재·사전·음원 목록은 설치와 버전 업데이트에 포함한다.
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}', 'data/*.json'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        runtimeCaching: [
          {
            // 재생한 mp3는 캐시 → 다음부터 오프라인 재생 (precache 제외, §10)
            urlPattern: /\/tts\/[0-9a-f]+\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'chintalk-tts-audio',
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: Math.max(1000, Math.ceil(audioFiles.size * 1.5)) },
            },
          },
        ],
      },
    }),
  ],
});
