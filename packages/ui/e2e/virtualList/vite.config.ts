import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

import { foldkitAliases } from '../../../../examples/vite.aliases'

const packageDirectory = fileURLToPath(new URL('../../', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./fixture', import.meta.url)),
  plugins: [foldkit({ devToolsMcpPort: false })],
  resolve: {
    alias: foldkitAliases(packageDirectory),
    dedupe: ['effect', 'foldkit'],
  },
  server: {
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../../../../', import.meta.url))] },
  },
})
