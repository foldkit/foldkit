import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('snake example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('space starts the game', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Press SPACE to start')).toBeVisible()
    await page.keyboard.press(' ')
    await expect(page.getByText(/Playing/)).toBeVisible()
  })
})
