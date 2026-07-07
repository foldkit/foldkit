import { configDefaults, defineConfig } from 'vitest/config'

// The integration fixtures under test/integration/fixtures are source files
// fed to real oxlint by real-oxlint.test.ts, not Vitest suites. Exclude them
// so Vitest never tries to run a fixture (some are named *.test.ts to satisfy
// a rule's file gate).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'test/integration/fixtures/**'],
  },
})
