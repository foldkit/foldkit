import { defineConfig } from 'vitest/config'

import { markdown } from '@foldkit/markdown/vite'

import { islandAttributes } from './src/domain/islandAttributes'

export default defineConfig({
  plugins: [markdown({ islands: islandAttributes })],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
    server: {
      deps: {
        inline: ['foldkit', '@foldkit/ui', '@foldkit/devtools'],
      },
    },
  },
})
