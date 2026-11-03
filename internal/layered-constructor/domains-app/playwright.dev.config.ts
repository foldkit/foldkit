import { defineConfig } from '@playwright/test'

import productionConfig from './playwright.config'

const PORT = 5181
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  ...productionConfig,
  testMatch: '**/domains.dev.spec.ts',
  use: { ...productionConfig.use, baseURL: BASE_URL },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
