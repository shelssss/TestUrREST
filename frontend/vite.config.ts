import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    // In Docker the backend is reachable by service name; locally it is
    // localhost. Requests to /api are proxied so the browser only ever
    // talks to one origin and CORS stays out of the way in development.
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 5173, host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        // Split the two large, rarely-changing dependencies out of the app
        // bundle so a code change does not force a re-download of the
        // charting library, which is the bulk of the weight.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
})
