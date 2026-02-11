import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/convertfilepro/',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
})
