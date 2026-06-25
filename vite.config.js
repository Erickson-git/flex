import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
    plugins: [
        react(),
        VitePWA({
            // 'autoUpdate' : la nouvelle version s'applique automatiquement au prochain
            // chargement (fini les versions périmées coincées en cache).
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'logo.jpg', 'icons/*.png'],
            manifest: {
                name: 'FLEX',
                short_name: 'FLEX',
                description: 'Le réseau social du Flex. Les 100 premiers deviennent Pionniers.',
                theme_color: '#050505',
                background_color: '#050505',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                categories: ['social', 'lifestyle'],
                icons: [
                    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff2}'],
                navigateFallback: '/index.html',
                // Ne pas remplacer ces vraies pages/fichiers par l'app (SPA fallback).
                navigateFallbackDenylist: [/^\/legal\//, /^\/\.well-known\//],
                // Handlers de notifications push (importés dans le SW généré).
                importScripts: ['push-handler.js'],
                runtimeCaching: [
                    {
                        urlPattern: function (_a) {
                            var url = _a.url;
                            return url.pathname.startsWith('/storage/');
                        },
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
});
