import { defineConfig, devices } from '@playwright/test'

const PORT = 5180
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/domains.spec.ts',
    '**/domains.a11y.spec.ts',
    '**/domains.mobile.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js build && node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
