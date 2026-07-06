import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // HMR stays on unless AI Studio explicitly disables it.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
