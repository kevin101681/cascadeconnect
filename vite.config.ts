
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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (increased for large vendor bundle)
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: true,
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
            
            // Split only truly independent large libraries
            if (id.includes('node_modules')) {
              // PDF libraries are large and independent
              if (id.includes('pdfjs') || id.includes('pdf-dist')) {
                return 'vendor-pdf';
              }
              // Pusher is independent
              if (id.includes('pusher-js')) {
                return 'vendor-pusher';
              }
              // Keep everything else together (React, UI libs, etc.)
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
