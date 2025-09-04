import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'StagAlgo - Professional Trading Platform',
        short_name: 'StagAlgo',
        description: 'Professional algorithmic trading platform with advanced analytics and portfolio management',
        theme_color: '#D4AF37',
        background_color: '#0F172A',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['finance', 'productivity', 'business'],
        shortcuts: [
          {
            name: "Trading Desk",
            short_name: "Trade",
            description: "Access the trading desk",
            url: "/trading-desk",
            icons: [{ src: "/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png", sizes: "96x96" }]
          },
          {
            name: "Portfolio",
            short_name: "Portfolio",
            description: "View portfolio",
            url: "/portfolio",
            icons: [{ src: "/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png", sizes: "96x96" }]
          }
        ]
      },
      devOptions: {
        enabled: mode === 'development'
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
