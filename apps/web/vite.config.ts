import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const backendTarget = process.env.BACKEND_URL || 'http://127.0.0.1:8001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/health': { target: backendTarget, changeOrigin: true },
      '/ready': { target: backendTarget, changeOrigin: true },
    },
  },
})
