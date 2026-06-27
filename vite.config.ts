import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AASA_URL_PATH = '/.well-known/apple-app-site-association'
const AASA_FILE = path.join(__dirname, 'public', '.well-known', 'apple-app-site-association')

/** Extensionless AASA must be served as application/json (dev + preview). */
function serveAppleAppSiteAssociation(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.originalUrl ?? req.url ?? '').split('?')[0]
    if (url !== AASA_URL_PATH) {
      next()
      return
    }
    if (!fs.existsSync(AASA_FILE)) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    res.setHeader('Content-Type', 'application/json')
    fs.createReadStream(AASA_FILE).pipe(res)
  }

  return {
    name: 'serve-apple-app-site-association',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveAppleAppSiteAssociation()],
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
