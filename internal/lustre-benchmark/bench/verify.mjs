import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

import { startServer } from './server.mjs'

/**
 * Functional check of an installed implementation slot. The benchmark
 * driver only reads timings; this asserts the app actually behaves: add,
 * toggle, destroy, double-click edit, filters, toggle-all, clear-completed.
 *
 *   HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:verify
 *
 * Environment: HARNESS_DIR (required), IMPL (default foldkit-dev-optimised),
 * PORT, FOLDKIT_BENCH_CHROMIUM.
 */

const benchDir = dirname(fileURLToPath(import.meta.url))

const harnessDir = process.env.HARNESS_DIR
if (!harnessDir) {
  console.error(
    'HARNESS_DIR is required: path to a lustre-labs/benchmark clone',
  )
  process.exit(1)
}

const implementation = process.env.IMPL ?? 'foldkit-dev-optimised'
const port = Number(process.env.PORT ?? 8378)
const baseUrl = `http://localhost:${port}`

const server = await startServer(harnessDir, benchDir, port)
let browser = null
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FOLDKIT_BENCH_CHROMIUM,
  })
  const page = await browser.newPage()
  await page.route(/unpkg\.com|todomvc\.com/, route =>
    route.fulfill({
      status: 200,
      contentType: 'text/css',
      headers: { 'Cross-Origin-Resource-Policy': 'cross-origin' },
      body: '',
    }),
  )
  let maybePageError = null
  page.on('pageerror', error => {
    maybePageError ??= error
    console.error('PAGEERROR:', error.message)
  })
  await page.goto(
    `${baseUrl}/priv/implementations/${implementation}/dist/index.html`,
  )

  const input = page.locator('.new-todo')
  await input.waitFor()

  const expectedLabels = ['alpha', 'beta', 'gamma']
  for (const text of expectedLabels) {
    await input.fill(text)
    await input.press('Enter')
  }
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li').length === 3,
  )
  const labels = await page.locator('.todo-list li label').allTextContents()
  if (JSON.stringify(labels) !== JSON.stringify(expectedLabels)) {
    throw new Error(`unexpected labels: ${JSON.stringify(labels)}`)
  }
  console.log('labels:', JSON.stringify(labels))

  await page.locator('.todo-list li:nth-of-type(2) .toggle').click()
  await page.waitForFunction(() =>
    document
      .querySelector('.todo-list li:nth-of-type(2)')
      .classList.contains('completed'),
  )
  console.log('toggle -> completed ok')
  console.log('count text:', await page.locator('.todo-count').textContent())

  await page.locator('.todo-list li:nth-of-type(1) .destroy').click()
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li').length === 2,
  )
  console.log(
    'destroy ok, remaining:',
    JSON.stringify(await page.locator('.todo-list li label').allTextContents()),
  )

  await page.locator('.todo-list li:nth-of-type(1) label').dblclick()
  const edit = page.locator('.todo-list li.editing .edit')
  await edit.waitFor()
  await edit.fill('beta edited')
  await edit.press('Enter')
  await page.waitForFunction(() => {
    const label = document.querySelector('.todo-list li:nth-of-type(1) label')
    return label !== null && label.textContent === 'beta edited'
  })
  console.log('edit flow ok')

  await page.locator('.filters a[href="#/active"]').click()
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li').length === 1,
  )
  const activeLabels = await page
    .locator('.todo-list li label')
    .allTextContents()
  if (JSON.stringify(activeLabels) !== JSON.stringify(['gamma'])) {
    throw new Error(`unexpected active labels: ${JSON.stringify(activeLabels)}`)
  }
  console.log('active filter ok:', JSON.stringify(activeLabels))

  await page.locator('.filters a[href="#/"]').click()
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li').length === 2,
  )

  await page.locator('.toggle-all').click()
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li.completed').length === 2,
  )
  await page.locator('.clear-completed').click()
  await page.waitForFunction(
    () => document.querySelectorAll('.todo-list li').length === 0,
  )
  console.log('toggle-all + clear-completed ok')

  if (maybePageError !== null) {
    throw maybePageError
  }
  console.log(`VERIFY ${implementation}: OK`)
} finally {
  if (browser !== null) {
    await browser.close()
  }
  server.close()
}
