import { randomUUID } from 'node:crypto'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

// The gate builds this project twice, as two deployments, so it names the
// output root and the build id per run. Vite reads this file once per
// environment it builds, so the generated fallback is stored back into the
// environment rather than regenerated: the browser bundle and the server bundle
// of one build have to carry the same id.
process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()
const outRoot = process.env['CONSUMER_OUT_ROOT'] ?? 'dist'

export default defineConfig({
  plugins: [
    foldkit({
      buildId: process.env['FOLDKIT_BUILD_ID'],
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
