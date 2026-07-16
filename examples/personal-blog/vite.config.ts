import { defineConfig } from 'vite'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'
import { islandAttributes } from './src/island/islandAttributes'

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
    markdown({ islands: islandAttributes }),
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
