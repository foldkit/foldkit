import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('todo example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('adds a todo', async ({ page }) => {
    await page.goto('/')
    await page
      .getByPlaceholder('What needs to be done?')
      .fill('Write Playwright tests')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('Write Playwright tests')).toBeVisible()
  })

  test('toggles a todo complete', async ({ page }) => {
    await page.goto('/')
    await page
      .getByPlaceholder('What needs to be done?')
      .fill('Write Playwright tests')
    await page.getByRole('button', { name: 'Add' }).click()

    const checkbox = page.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })
})
