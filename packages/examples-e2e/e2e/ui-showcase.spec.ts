import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('ui-showcase example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates to the Button component page', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Button', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/button$/)
  })
})
