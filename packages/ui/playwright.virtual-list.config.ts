import { existsSync } from 'node:fs'

import { defineConfig, devices, firefox, webkit } from '@playwright/test'

const chromiumExecutable = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
const webkitExecutable =
  process.env['PLAYWRIGHT_WEBKIT_EXECUTABLE'] ?? webkit.executablePath()
const firefoxExecutable =
  process.env['PLAYWRIGHT_FIREFOX_EXECUTABLE'] ?? firefox.executablePath()
const chromiumLaunchOptions =
  chromiumExecutable === undefined
    ? {}
    : { launchOptions: { executablePath: chromiumExecutable } }

export default defineConfig({
  testDir: './e2e/virtualList',
  testMatch: '*.spec.ts',
  globalSetup: './e2e/virtualList/globalSetup.ts',
  outputDir: './test-results/virtual-list',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 7_500 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${process.env['FOLDKIT_VIRTUAL_LIST_E2E_PORT'] ?? '4197'}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], ...chromiumLaunchOptions },
    },
    {
      name: 'chromium-narrow',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 664 },
        ...chromiumLaunchOptions,
      },
    },
    ...(existsSync(webkitExecutable)
      ? [
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              launchOptions: { executablePath: webkitExecutable },
            },
          },
        ]
      : []),
    ...(existsSync(firefoxExecutable)
      ? [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              launchOptions: { executablePath: firefoxExecutable },
            },
          },
        ]
      : []),
  ],
})
