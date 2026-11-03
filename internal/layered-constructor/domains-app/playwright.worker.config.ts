import { defineConfig } from '@playwright/test'

import productionConfig from './playwright.config'

const PORT = 5182
const BASE_URL = `http://127.0.0.1:${PORT}`
const RPC_PORT = 5183
const RPC_BASE_URL = `http://127.0.0.1:${RPC_PORT}`

export default defineConfig({
  ...productionConfig,
  testMatch: [
    '**/domains.spec.ts',
    '**/domains.a11y.spec.ts',
    '**/domains.mobile.spec.ts',
    '**/domains.worker.spec.ts',
  ],
  use: { ...productionConfig.use, baseURL: BASE_URL },
  projects: [
    ...(productionConfig.projects ?? []),
    {
      name: 'rpc',
      testMatch: '**/domains.rpc.spec.ts',
      use: { baseURL: RPC_BASE_URL },
      workers: 1,
    },
  ],
  webServer: [
    {
      command: `node node_modules/vite/bin/vite.js build && node node_modules/wrangler/bin/wrangler.js dev --local --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `node node_modules/wrangler/bin/wrangler.js dev --local --config e2e/fixtures/wrangler.jsonc --ip 127.0.0.1 --port ${RPC_PORT}`,
      url: `${RPC_BASE_URL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
