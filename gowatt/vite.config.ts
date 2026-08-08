import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    // Multi-page build: the 3D journey (index) plus canvas-free text pages.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        en: resolve(__dirname, 'en/index.html'),
        about: resolve(__dirname, 'about.html'),
        faq: resolve(__dirname, 'faq.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
    // three + drei are large; keep them in their own chunk so the hero HTML
    // (the LCP element) is never blocked on the 3D bundle.
    chunkSizeWarningLimit: 1200,
  },
})
