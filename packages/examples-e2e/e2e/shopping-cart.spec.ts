import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('shopping-cart example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to the Cart route', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Cart', exact: true }).click()
    await expect(page).toHaveURL(/\/cart/)
  })
})
