import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  server: {
    port: 5173,
    open: true,
    host: true,              // allow access from external URLs
    allowedHosts: ["open-taxes-exist.loca.lt"],     // allow all hosts, including Cloudflare tunnels
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})