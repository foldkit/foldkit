import { defineConfig } from 'vitest/config'

import { foldkitAliases } from '../../examples/vite.aliases'

export default defineConfig({
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  test: {
    environment: 'happy-dom',
    pool: 'forks',
    forks: { singleFork: true },
    isolate: false,
  },
})
