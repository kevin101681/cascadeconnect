
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
  
  return {
    plugins: [react()],
    define: {
      'process.env': safeEnvVars
    },
    optimizeDeps: {
      exclude: ['@neondatabase/serverless', 'drizzle-orm'],
    },
    build: {
      target: 'esnext'
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
    },
  };
});
