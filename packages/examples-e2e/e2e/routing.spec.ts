import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('routing example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to people route', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'People', exact: true }).click()
    await expect(page).toHaveURL(/\/people/)
  })
})
