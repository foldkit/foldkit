import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('websocket-chat example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('Connect button transitions out of the disconnected state', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Connect to Chat' }).click()
    await expect(
      page.getByRole('button', { name: 'Connect to Chat' }),
    ).toBeHidden()
  })
})
