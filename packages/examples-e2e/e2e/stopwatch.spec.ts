import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('stopwatch example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('Start swaps to Stop when clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  })
})
