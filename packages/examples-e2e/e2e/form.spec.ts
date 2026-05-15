import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('form example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill('not-an-email')
    await expect(
      page.getByText('Please enter a valid email address'),
    ).toBeVisible()
  })
})
