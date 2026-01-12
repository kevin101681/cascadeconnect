
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Only expose safe, public environment variables to the client
  // NEVER expose secrets like DATABASE_URL, API_SECRET, etc.
  const safeEnvVars = {
    VITE_CLERK_PUBLISHABLE_KEY: env.VITE_CLERK_PUBLISHABLE_KEY,
    // Only expose variables that are safe for client-side use
    // Database URL and secrets should be server-side only
  };
  
  // Custom plugin to serve HTML files from public directory
  // Must use 'pre' enforce to run before Vite's SPA fallback
  const serveStaticHtml = (): Plugin => ({
    name: 'serve-static-html',
    enforce: 'pre',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          // Log the request for debugging
          if (req.url?.includes('.html')) {
            console.log('HTML request intercepted:', req.url);
          }
          
          if (req.url === '/complete_homeowner_manual.html' || req.url?.startsWith('/complete_homeowner_manual.html?')) {
            const filePath = path.join(__dirname, 'public', 'complete_homeowner_manual.html');
            try {
              const html = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'text/html');
              res.setHeader('Cache-Control', 'no-cache');
              res.statusCode = 200;
              res.end(html);
              console.log('✓ Served complete_homeowner_manual.html');
              return;
            } catch (err) {
              console.error('Error reading complete_homeowner_manual.html:', err);
            }
          }
          if (req.url === '/homeowner-manual.html' || req.url?.startsWith('/homeowner-manual.html?')) {
            const filePath = path.join(__dirname, 'public', 'homeowner-manual.html');
            try {
              const html = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'text/html');
              res.setHeader('Cache-Control', 'no-cache');
              res.statusCode = 200;
              res.end(html);
              console.log('✓ Served homeowner-manual.html');
              return;
            } catch (err) {
              console.error('Error reading homeowner-manual.html:', err);
            }
          }
          next();
        });
      };
    }
  });

  return {
    plugins: [
      serveStaticHtml(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'favicon.ico', 'complete_homeowner_manual.html', 'homeowner-manual.html'],
        manifest: {
          name: 'CASCADE CONNECT',
          short_name: 'CASCADE',
          description: 'The premier warranty management platform for builders and homeowners',
          theme_color: '#3c6b80',
          background_color: '#f3f4f6', // Light gray background for splash screen
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: '/logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'maskable'
            },
            {
              src: '/logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          // IMPORTANT:
          // Prevent "white screen" after deploy: Workbox serves cached `index.html` for navigations.
          // If that cached HTML references hashed chunks that aren't available, the app won't boot.
          // So we precache *all* built JS/CSS/font assets (but still exclude the huge PDF worker and maps).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
          globIgnores: [
            '**/*.map',
            // Keep the massive PDF worker out of the precache (fetch on-demand only).
            '**/assets/pdf.worker*.js',
            // Large static manuals/images are not needed for initial shell.
            '**/images/manual/**',
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (increased for large vendor bundle)
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: []
        },
        devOptions: {
          // Disable SW in dev to avoid persistent caching bugs / blank screens while iterating.
          enabled: false,
          type: 'module'
        }
      })
    ],
    define: {
      'process.env': safeEnvVars
    },
    optimizeDeps: {
      exclude: ['@neondatabase/serverless', 'drizzle-orm'],
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks(id) {
            // Create a separate chunk for CBS Books app
            if (id.includes('lib/cbsbooks/App')) {
              return 'cbsbooks-app';
            }
            
            if (id.includes('node_modules')) {
              // Resolve package name from node_modules path.
              const rel = id.split('node_modules/')[1] || '';
              const parts = rel.split('/');
              const pkg = parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];

              if (!pkg) return 'vendor';

              // 1) Core (React + router) — stable, changes infrequently.
              if (
                pkg === 'react' ||
                pkg === 'react-dom' ||
                pkg === 'react-router' ||
                pkg === 'react-router-dom' ||
                pkg === 'scheduler'
              ) {
                return 'vendor-core';
              }

              // 2) UI libs (Radix/Shadcn building blocks + icons + small utilities).
              if (
                pkg.startsWith('@radix-ui/') ||
                pkg === 'lucide-react' ||
                pkg === 'cmdk' ||
                pkg === 'clsx' ||
                pkg === 'tailwind-merge'
              ) {
                return 'vendor-ui';
              }

              // 3) Motion (framer-motion is used widely and is chunky).
              if (pkg === 'framer-motion') {
                return 'vendor-motion';
              }

              // 4) Date/time libs (calendar tooling, scheduling, formatting).
              if (
                pkg === 'date-fns' ||
                pkg === 'moment' ||
                pkg === 'react-big-calendar' ||
                pkg === 'react-day-picker' ||
                pkg === 'ics'
              ) {
                return 'vendor-date';
              }

              // 5) PDF + document heavyweights.
              if (
                pkg === 'pdfjs-dist' ||
                pkg === 'react-pdf' ||
                pkg === 'react-pageflip' ||
                pkg === '@jaymanyoo/pdf-book-viewer' ||
                pkg === '@jaymanyoo/pdf-book-viewer/react'
              ) {
                return 'vendor-pdf';
              }

              // 6) Realtime (independent).
              if (pkg === 'pusher-js' || pkg === 'pusher') {
                return 'vendor-pusher';
              }

              // 7) DB / data layer (often admin-only, heavy).
              if (
                pkg === 'drizzle-orm' ||
                pkg === '@neondatabase/serverless' ||
                pkg === 'pg' ||
                pkg === 'postgres'
              ) {
                return 'vendor-db';
              }

              // 8) AI SDKs (not needed for initial paint).
              if (pkg === 'openai' || pkg === '@google/genai') {
                return 'vendor-ai';
              }

              // 9) Canvas/media heavy libs.
              if (pkg === 'fabric' || pkg === 'html2canvas') {
                return 'vendor-canvas';
              }

              // 10) Large file/parse libs.
              if (pkg === 'xlsx' || pkg === 'papaparse') {
                return 'vendor-files';
              }

              // Everything else.
              return 'vendor';
            }
          },
          // Ensure consistent chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Don't hash HTML files - keep original names for direct access
            if (assetInfo.name?.endsWith('.html')) {
              return '[name].[ext]';
            }
            return 'assets/[name]-[hash].[ext]';
          }
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Ensure public directory files are copied as-is
      copyPublicDir: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        'bluetag': path.resolve(__dirname, '../BlueTag'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
      // Ensure static HTML files are served directly without SPA fallback
      middlewareMode: false,
    },
    publicDir: 'public',
  };
});
