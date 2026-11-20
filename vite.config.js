import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import crypto from 'node:crypto'

// Service worker: src/sw-template.js is emitted as /sw.js with the list of built
// JS/CSS files filled in, so the whole app shell (including lazily loaded screens)
// is available offline after the first visit. The version changes with every build.
function serviceWorker() {
  return {
    name: 'jn-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f)).sort().map((f) => '/' + f)
      const version = crypto.createHash('sha1').update(assets.join('|')).digest('hex').slice(0, 10)
      const source = fs.readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8')
        .replace('"__PRECACHE__"', JSON.stringify(assets))
        .replace('__VERSION__', version)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Libraries change rarely — keeping them in their own files means an app
        // update does not make every user download them again.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'firebase'
          return 'vendor'
        },
      },
    },
  },
})
