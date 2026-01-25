import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true, // Ne pas basculer sur 5175 si 5174 est pris
    proxy: {
      '/api': {
        target: 'http://localhost:5087',
        changeOrigin: true,
        rewrite: (path) => path, // Ne pas réécrire le chemin, garder /api
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

