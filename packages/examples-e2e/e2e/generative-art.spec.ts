import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('generative-art example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('Pause toggles to Play', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  })
})
