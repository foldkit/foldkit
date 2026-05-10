import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('slow-warnings example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('records a warning for each slow phase', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Run update work' }).click()
    await expect(page.getByText(/Update exceeded/)).toBeVisible()

    await page.getByRole('button', { name: 'Run view work' }).click()
    await expect(page.getByText(/View exceeded/)).toBeVisible()

    await page.getByRole('button', { name: 'Run patch work' }).click()
    await expect(page.getByText(/Patch exceeded/)).toBeVisible()

    await page.getByRole('button', { name: 'Run subscriptions work' }).click()
    await expect(page.getByText(/Subscriptions exceeded/)).toBeVisible()
  })
})
