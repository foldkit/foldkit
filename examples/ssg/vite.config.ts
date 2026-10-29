import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'
import { exampleClientDependencies } from '../vite.dependencies'

export default defineConfig({
  plugins: [
    tailwindcss(),
    exampleClientDependencies(),
    foldkit({
      devToolsMcpPort: 9993,
      ssr: {
        serverEntry: '/src/entry.server.ts',
        clientEntry: '/src/entry.ts',
        build: { prerender: { origin: 'https://example.com' } },
      },
    }),
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
