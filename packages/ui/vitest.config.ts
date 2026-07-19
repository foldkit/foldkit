import { defineConfig } from 'vitest/config'

// NOTE: imported from source rather than the package entry so knip and a
// clean-checkout CI run do not depend on the plugin's dist being built.
import { foldkitViewIdentity } from '../vite-plugin-foldkit/src/viewIdentity.ts'

export default defineConfig({
  plugins: [foldkitViewIdentity()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
  },
})
