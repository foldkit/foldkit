import { defineConfig } from '@playwright/test'

import productionConfig from './playwright.config'

const baseURL = process.env['DOMAINS_BASE_URL']

if (!baseURL) {
  throw new Error('Set DOMAINS_BASE_URL to the deployed preview URL')
}

export default defineConfig({
  ...productionConfig,
  testMatch: [
    '**/domains.spec.ts',
    '**/domains.a11y.spec.ts',
    '**/domains.mobile.spec.ts',
    '**/domains.worker.spec.ts',
  ],
  use: { ...productionConfig.use, baseURL },
  projects: [
    ...(productionConfig.projects ?? []),
    {
      name: 'rpc',
      testMatch: '**/domains.rpc.spec.ts',
      use: { baseURL },
      workers: 1,
    },
  ],
  webServer: [],
})
