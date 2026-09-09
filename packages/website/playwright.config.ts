import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env['FOLDKIT_WEBSITE_E2E_PORT'] ?? 4173)
export const BASE_URL = `http://localhost:${PORT}`
const liveWebsiteUrl = process.env['FOLDKIT_LIVE_WEBSITE_URL']
const isLivePlaygroundSmoke = liveWebsiteUrl !== undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isLivePlaygroundSmoke,
  forbidOnly: Boolean(process.env['CI']),
  retries: isLivePlaygroundSmoke || process.env['CI'] === undefined ? 1 : 2,
  reporter: process.env['CI'] ? 'github' : 'list',
  timeout: isLivePlaygroundSmoke ? 300_000 : 60_000,
  use: {
    baseURL: liveWebsiteUrl ?? BASE_URL,
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
  ...(isLivePlaygroundSmoke
    ? { testMatch: 'livePlaygrounds.ts', workers: 1 }
    : {
        globalSetup: './e2e/globalSetup.ts',
        webServer: {
          command: `pnpm dev --port ${PORT} --strictPort`,
          // NOTE: the readiness probe sends no Accept header, and the dev SSR
          // middleware only renders requests that accept HTML, so probing `/`
          // would 404 until the timeout. A public asset is served by Vite itself
          // the moment the server is up.
          url: `${BASE_URL}/theme-init.js`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
      }),
})
