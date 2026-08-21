import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark')) return 'markdown';
        },
      },
    },
  },
  server: {
    // HMR stays on unless AI Studio explicitly disables it.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
