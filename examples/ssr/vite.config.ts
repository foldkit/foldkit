import { randomUUID } from 'node:crypto'
import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'

// NOTE: one id has to name this build, and a build that has none refuses to
// render a hydratable page. A deployment sets FOLDKIT_BUILD_ID to a value it
// already has, such as a commit or a release tag; a local build takes a fresh
// one rather than a constant, which would make a stale page look current.
// NOTE: the fallback is stored back into the environment because Vite reads
// this file once per environment it builds, and a fresh id per read would give
// the browser bundle and the server bundle different ids, which is the exact
// disagreement the id exists to catch: every page of a deployment refused at
// hydration. Storing it means every later read of this file, in this process,
// resolves the same id.
// NOTE: `||=` rather than `??=` because the plugin treats an empty
// FOLDKIT_BUILD_ID as absent, so an empty value has to take the fallback here
// too; `??=` would keep it and the build would compile no id at all.
process.env['FOLDKIT_BUILD_ID'] ||= randomUUID()
const buildId = process.env['FOLDKIT_BUILD_ID']

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({
      buildId,
      devToolsMcpPort: 9992,
      ssr: {
        serverEntry: '/src/entry.server.ts',
        build: true,
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
