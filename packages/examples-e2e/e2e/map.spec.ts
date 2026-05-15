import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('map example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('filters the locations sidebar by search query', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Filter locations').fill('zzznoresult')
    await expect(page.getByText(/No locations match/)).toBeVisible()
  })
})
