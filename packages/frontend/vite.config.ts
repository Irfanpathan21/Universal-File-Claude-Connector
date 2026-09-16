import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@uft/shared': path.resolve(__dirname, '../shared/src/registry/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
