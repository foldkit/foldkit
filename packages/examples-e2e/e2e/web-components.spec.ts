import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('web-components example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('encoded value propagates to the QR code element', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Encoded value').fill('hello-foldkit')
    await expect(page.locator('sl-qr-code')).toHaveJSProperty(
      'value',
      'hello-foldkit',
    )
  })
})
