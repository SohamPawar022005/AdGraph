import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      // The browser only ever talks to the Vite dev server (same-origin preview
      // URL). Vite itself (running inside the sandbox) proxies API calls to the
      // FastAPI backend on localhost:8000 -- the browser never addresses
      // localhost/127.0.0.1 directly. See apps/api for the backend.
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ready': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
