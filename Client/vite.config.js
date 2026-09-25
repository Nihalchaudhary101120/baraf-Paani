import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // PouchDB uses 'global' — polyfill for browser
    global: 'globalThis',
  },
  optimizeDeps: {
    // Force Vite to pre-bundle PouchDB (CJS → ESM transformation)
    include: ['pouchdb-browser'],
  },
})
