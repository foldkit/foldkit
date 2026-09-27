import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases.ts'
import { electricBackend } from './server/index.ts'

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
    electricBackend(),
  ],
  resolve: {
    alias: foldkitAliases(import.meta.dirname),
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
