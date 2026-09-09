import { randomUUID } from 'node:crypto'
import { defineConfig } from 'vite'

import { foldkit } from '../../../src/index.ts'

// The shape a generated project uses. Vite evaluates this file once per
// environment it builds, so the fallback is stored where the next evaluation
// finds it: a fresh id per evaluation would give the browser bundle and the
// server bundle different ids.
process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()
const buildId = process.env['FOLDKIT_BUILD_ID']

export default defineConfig({
  logLevel: 'silent',
  plugins: [
    foldkit({
      buildId,
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
