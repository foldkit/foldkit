import { defineConfig, devices } from '@playwright/test'

const exampleSlug = process.env['EXAMPLE_SLUG']
if (!exampleSlug) {
  throw new Error(
    'EXAMPLE_SLUG environment variable is required. ' +
      'Example: EXAMPLE_SLUG=counter pnpm --filter @foldkit/examples-e2e test:e2e',
  )
}

const PORT = 5180
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: `**/${exampleSlug}.spec.ts`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 1,
  reporter: process.env['CI'] ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: `pnpm -C ../../examples/${exampleSlug} exec vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
