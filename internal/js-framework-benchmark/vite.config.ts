import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit()],
  build: {
    target: 'es2022',
    minify: 'oxc',
    sourcemap: false,
    modulePreload: { polyfill: false },
    lib: {
      name: 'main',
      formats: ['iife'],
      entry: 'src/main.ts',
      fileName: () => 'main.js',
    },
  },
})
