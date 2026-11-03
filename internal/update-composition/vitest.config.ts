import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./packages/foldkit/src/test/vitest-setup.ts'],
    include: [
      'packages/foldkit/declaration-tests/update-composition/**/*.test.ts',
    ],
  },
})
