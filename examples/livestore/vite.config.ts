import { type Plugin, defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../vite.aliases'

const skipFoldkitEffectPrebundle = (): Plugin => ({
  name: 'livestore:skip-foldkit-effect-prebundle',
  configResolved: config => {
    // NOTE: LiveStore's worker needs one Effect module graph. Foldkit's fallback
    // list creates separate prebundle entries in dev, so let Vite discover the
    // Effect imports this application uses instead.
    const includedDependencies = config.optimizeDeps.include
    if (includedDependencies === undefined) {
      return
    }

    config.optimizeDeps.include = includedDependencies.filter(
      dependency => !dependency.startsWith('effect/'),
    )
  },
})

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
    skipFoldkitEffectPrebundle(),
  ],
  optimizeDeps: {
    exclude: ['@livestore/adapter-web', '@livestore/wa-sqlite'],
  },
  worker: { format: 'es' },
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
