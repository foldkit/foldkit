import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('counter example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('mounts the development DevTools overlay automatically', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#foldkit-devtools')).toBeAttached()
  })

  test('records Messages in the development DevTools of an iframe', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#foldkit-devtools')).toBeAttached()

    await page.evaluate(() => {
      const iframe = document.createElement('iframe')
      iframe.title = 'Embedded counter'
      iframe.src = '/'
      iframe.width = '800'
      iframe.height = '600'
      document.body.appendChild(iframe)
    })

    const embeddedCounter = page.frameLocator(
      'iframe[title="Embedded counter"]',
    )
    await expect(embeddedCounter.locator('#foldkit-devtools')).toBeAttached()

    await embeddedCounter
      .getByRole('button', { name: '+', exact: true })
      .click()
    await embeddedCounter.locator('.dt-badge').click()
    await expect(embeddedCounter.locator('.dt-panel')).toBeVisible()
    await expect(
      embeddedCounter
        .locator('.dt-row')
        .filter({ hasText: 'ClickedIncrement' }),
    ).toHaveCount(1)
    await expect(page).toHaveTitle('Counter: 0')
  })

  test('increments when + is clicked', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+' }).click()
    await expect(page).toHaveTitle(/Counter: 1/)
  })
})
