import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/assets/react/',
  build: {
    outDir: '../assets/react',
    emptyOutDir: true
  }
});
