import { defineConfig } from 'vite'

import { foldkitAliases } from '../../examples/vite.aliases'

const variant = process.env['BUILD_VARIANT'] ?? 'naive'
const isOptimised = variant === 'optimised'

export default defineConfig({
  base: './',
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  build: {
    outDir: isOptimised ? 'dist/optimised' : 'dist/naive',
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: isOptimised ? 'index.optimised.html' : 'index.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
