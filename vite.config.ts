import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-only proxy to dodge CORS when importing from the Nozbe Classic API.
      // The browser calls /nozbe-api/... and Vite forwards it server-side.
      '/nozbe-api': {
        target: 'https://api.nozbe.com:3000',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/nozbe-api/, ''),
      },
    },
  },
})
