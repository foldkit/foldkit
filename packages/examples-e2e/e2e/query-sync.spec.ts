import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('query-sync example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('search filters the table and updates the URL', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Search by name…').fill('Tyrannosaurus')
    await expect(page).toHaveURL(/search=Tyrannosaurus/)
    await expect(
      page.getByRole('cell', { name: /Tyrannosaurus/ }),
    ).toBeVisible()
  })
})
