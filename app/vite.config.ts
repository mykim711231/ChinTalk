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
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? `local-${new Date().toISOString().slice(0, 19)}`),
  },
  plugins: [
    react(),
    VitePWA({
      // 등록·화면 재시작은 직접 관리한다. 다른 탭이 열려 있어도 다음 실행은 새 버전을 사용한다.
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
        skipWaiting: true,
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
