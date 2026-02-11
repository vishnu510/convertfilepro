import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/convertfilepro/',
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
