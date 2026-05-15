import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('auth example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('redirects to login when no session', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
