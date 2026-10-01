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

const webServerCommand = (slug: string): string => {
  if (slug === 'ssr') {
    return `pnpm -C ../../examples/ssr build && PORT=${PORT} pnpm -C ../../examples/ssr start`
  } else if (slug === 'ssg') {
    return `pnpm -C ../../examples/ssg build && pnpm -C ../../examples/ssg exec vite preview --outDir dist/client --port ${PORT} --strictPort`
  } else {
    return `pnpm -C ../../examples/${slug} exec vite --port ${PORT} --strictPort`
  }
}

export default defineConfig({
  testDir: './e2e',
  testMatch: `**/${exampleSlug}.spec.ts`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 1,
  reporter: process.env['CI'] ? 'github' : 'list',
  outputDir: `./test-results/${exampleSlug}`,
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // NOTE: sandboxes without network access to the browser CDN can point
    // this at a preinstalled chromium; CI leaves it unset and uses the
    // version playwright installs.
    ...(process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'] !== undefined && {
      launchOptions: {
        executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'],
      },
    }),
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: webServerCommand(exampleSlug),
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
