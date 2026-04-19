import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
    exclude: [...configDefaults.exclude, '**/*.bench.test.ts'],
    server: {
      deps: {
        inline: ['foldkit'],
      },
    },
  },
})
