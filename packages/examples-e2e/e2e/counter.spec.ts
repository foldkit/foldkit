import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('counter example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('mounts the development DevTools overlay automatically', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#foldkit-devtools')).toBeAttached()
  })

  test('increments when + is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+' }).click()
    await expect(page).toHaveTitle(/Counter: 1/)
  })
})
