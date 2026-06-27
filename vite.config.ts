import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // Native file-system events are unreliable in this environment, so poll for changes.
    // This guarantees edits trigger hot reload without restarting the dev server.
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/fileit-suggest': {
        target: 'https://papr-cursor.expo.app',
        changeOrigin: true,
        secure: true,
      },
      '/document-analyze': {
        target: 'https://papr-cursor.expo.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
