import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

const outRoot = process.env['CONSUMER_OUT_ROOT'] ?? 'dist'

export default defineConfig({
  plugins: [
    foldkit({
      ssr: {
        serverEntry: '/src/entry.server.ts',
        build: {
          clientOutDir: `${outRoot}/client`,
          serverOutDir: `${outRoot}/server`,
        },
      },
    }),
  ],
})
