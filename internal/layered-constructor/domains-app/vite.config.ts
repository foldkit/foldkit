import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    tailwindcss(),
    foldkit({
      // NOTE: This preview assigns separate dev identities to client and SSR environments; use one shared development identity.
      ...(command === 'serve' && !isPreview ? { buildId: 'development' } : {}),
      ssr: {
        serverEntry: '/src/server/entry.ts',
        clientEntry: '/src/client/entry.ts',
        build: { prerender: true },
      },
    }),
  ],
  resolve: { dedupe: ['effect', '@effect/platform-browser'] },
  optimizeDeps: { entries: ['src/client/entry.ts'] },
}))
