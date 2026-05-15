import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('crash-view example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('renders crash fallback when Crash is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Crash' }).click()
    await expect(page.getByText('Something went wrong')).toBeVisible()
  })
})
