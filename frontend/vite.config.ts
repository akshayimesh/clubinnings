import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin calls in dev: the browser hits Vite, Vite forwards to the API.
    proxy: {
      '/api': apiTarget,
      '/healthz': apiTarget,
    },
  },
});
