import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/test/apps/**',
        'src/test/vitest-setup.ts',
        'src/test/vitest.ts',
      ],
      thresholds: {
        statements: 72,
        branches: 72,
        functions: 57,
        lines: 72,
      },
    },
  },
})
