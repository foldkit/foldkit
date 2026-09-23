import { defineConfig } from 'vite'

import { foldkit } from '../../../src/index.ts'

export default defineConfig({
  logLevel: 'silent',
  plugins: [
    foldkit({
      ssr: {
        serverEntry: '/entry.server.ts',
        build: {
          clientOutDir: 'dist-test/config/client',
          serverOutDir: 'dist-test/config/server',
          prerender: { paths: ['/'] },
        },
      },
    }),
  ],
})
