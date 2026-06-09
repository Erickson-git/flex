import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.jpg', 'icons/*.jpg'],
      manifest: {
        name: 'FLEX — Freedom · Party · Show-biz',
        short_name: 'FLEX',
        description: 'Le réseau social du Flex. Brille en public, libère-toi en privé.',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['social', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: '/icons/icon-512.jpg', sizes: '512x512', type: 'image/jpeg' },
          { src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
          { src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'flex-media',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
