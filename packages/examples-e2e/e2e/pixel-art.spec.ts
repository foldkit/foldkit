import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('pixel-art example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('selecting Eraser updates the tool radio group', async ({ page }) => {
    await page.goto('/')
    const eraser = page.getByRole('radio', { name: /Eraser/ })
    await eraser.click()
    await expect(eraser).toBeChecked()
  })
})
