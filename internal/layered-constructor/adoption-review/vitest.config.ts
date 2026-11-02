import { defineConfig } from 'vitest/config'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: false })],
  test: { environment: 'happy-dom' },
})
