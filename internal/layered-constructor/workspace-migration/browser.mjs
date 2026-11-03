import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'

import { chromium } from '../../../packages/ui/node_modules/@playwright/test/index.mjs'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const pageErrors = []
page.on('pageerror', error => pageErrors.push(error.message))
try {
  await page.goto('http://127.0.0.1:45970/', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'All issues', exact: true }).waitFor()
  await page
    .getByRole('link', { name: /WSP-101/ })
    .first()
    .click()
  await page.getByLabel('Issue title', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Close issue', exact: true }).click()
  await page.getByRole('heading', { name: 'All issues', exact: true }).waitFor()
  await page.goto('http://127.0.0.1:45970/projects/experience/board', {
    waitUntil: 'networkidle',
  })
  await page.getByRole('button', { name: /Create issue in Todo/i }).waitFor()
  assert.deepEqual(pageErrors, [])
  writeFileSync(
    new URL('./browser-result.json', import.meta.url),
    JSON.stringify({ status: 'passed', pageErrors, url: page.url() }, null, 2) +
      '\n',
  )
} finally {
  await browser.close()
}
