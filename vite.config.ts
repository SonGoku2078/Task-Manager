import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output into server/public so the Express server can serve the SPA.
    outDir: 'server/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Dev/Test backend runs on 3002 (separate dev.db). See .env.development.
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
      '/health': { target: 'http://localhost:3002', changeOrigin: true },
      '/nozbe-api': {
        target: 'https://api.nozbe.com:3000',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/nozbe-api/, ''),
      },
    },
  },
})
