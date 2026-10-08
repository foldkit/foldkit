import { devices } from '@playwright/test'

import base from './playwright.config.ts'

export default {
  ...base,
  projects: [{ name: 'webkit-mobile', use: devices['iPhone 13'] }],
  workers: 2,
}
