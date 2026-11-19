import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'
import { exampleClientDependencies } from '../vite.dependencies'

export default defineConfig({
  plugins: [
    tailwindcss(),
    exampleClientDependencies(),
    foldkit({ devToolsMcpPort: 9998 }),
  ],
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
