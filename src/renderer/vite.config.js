import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    fs: {
      // Allow importing files from the project root (USERGUIDE.md is 2 levels up)
      allow: ['../..'],
    },
  },
});
