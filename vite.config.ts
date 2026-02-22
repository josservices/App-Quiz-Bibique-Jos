import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'og.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
        'robots.txt',
        'sitemap.xml'
      ],
      manifest: {
        name: 'Quiz Biblique (LSG 1910)',
        short_name: 'Quiz Bible',
        description: 'Quiz biblique en français basé sur la Louis Segond 1910.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        lang: 'fr',
        theme_color: '#0891b2',
        background_color: '#0f172a',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{html,css,js,ico,png,svg,webp,woff2,txt,xml,webmanifest}'],
        globIgnores: ['assets/*-normal-*.js', 'assets/*-difficile-*.js', 'assets/generalites-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/.*-(normal|difficile)-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quiz-question-chunks',
              expiration: {
                maxEntries: 220,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ url }) => /\/assets\/generalites-.*\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quiz-generalites-chunks',
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ url }) => /\/data\/questions\/.*\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'quiz-questions-json',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
  define: {
    'import.meta.env.SITE_URL': JSON.stringify(process.env.SITE_URL ?? '')
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
