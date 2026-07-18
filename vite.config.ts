import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

// #56: bake version + build time into the bundle. CI can override via
// VITE_APP_VERSION (like the mobile APK build); locally git describe gives
// "<last-tag>-<n>-g<sha>[-dirty]" or the bare sha on tagless clones.
const gitVersion = (): string => {
  try {
    return execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim()
  } catch {
    return 'unbekannt'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? gitVersion()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
