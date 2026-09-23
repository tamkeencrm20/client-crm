import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Recharts is heavy and only the dashboard needs it; splitting keeps
        // the first paint on every other page small.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          data: ['@tanstack/react-query', 'axios', 'socket.io-client'],
          intl: ['i18next', 'react-i18next', 'dayjs'],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Everything under /api and the socket goes to the Express server, so the
    // browser sees a single origin in development and CORS never comes up.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
