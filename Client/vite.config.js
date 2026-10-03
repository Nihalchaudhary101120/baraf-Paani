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
      events: path.resolve(__dirname, 'node_modules/events/events.js'),
    },
  },
  define: {
    // PouchDB uses 'global' — polyfill for browser
    global: 'globalThis',
  },
  optimizeDeps: {
    // Force Vite to pre-bundle PouchDB and events
    include: ['pouchdb-browser', 'events'],
  },
})
