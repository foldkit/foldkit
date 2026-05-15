import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('kanban example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('clicking "Add card" reveals the new card input', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Add card' }).first().click()
    await expect(page.getByPlaceholder('Card title...')).toBeVisible()
  })
})
