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

  test('adjusts cart quantity with the steppers', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add to Cart' }).first().click()
    await expect(
      page.getByRole('link', { name: 'Cart (1)', exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: '+', exact: true }).click()
    await expect(
      page.getByRole('link', { name: 'Cart (2)', exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: '-', exact: true }).click()
    await expect(
      page.getByRole('link', { name: 'Cart (1)', exact: true }),
    ).toBeVisible()
  })
})
