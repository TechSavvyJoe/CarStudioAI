import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load environment variables with VITE_ prefix (Vite's convention for client-side env vars)
    const env = loadEnv(mode, process.cwd(), 'VITE_');

    // Debug: Log if API key is loaded
    if (!env.VITE_GEMINI_API_KEY) {
      console.warn('⚠️  WARNING: VITE_GEMINI_API_KEY not found in .env.local');
    } else {
      console.log('✓ VITE_GEMINI_API_KEY loaded successfully (length: ' + env.VITE_GEMINI_API_KEY.length + ')');
    }

    return {
      server: {
        port: 3000,
        host: mode === 'production' ? 'localhost' : '127.0.0.1',
      },
      plugins: [react()],
      build: {
        chunkSizeWarningLimit: 1000, // Increase from default 500kb to 1000kb
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase': ['@supabase/supabase-js'],
              'gemini': ['@google/genai'],
            }
          }
        }
      },
      define: {
        // Pass the API key to the browser bundle
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
