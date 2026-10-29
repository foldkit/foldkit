import { defineConfig } from 'vite'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'
import { exampleClientDependencies } from '../vite.dependencies'
import { islandAttributes } from './src/island/islandAttributes'

export default defineConfig({
  plugins: [
    tailwindcss(),
    exampleClientDependencies(),
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
