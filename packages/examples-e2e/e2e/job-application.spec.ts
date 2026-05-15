import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('job-application example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('opening the Pronouns listbox reveals options', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Select pronouns' }).click()
    await expect(page.getByRole('option').first()).toBeVisible()
  })
})
