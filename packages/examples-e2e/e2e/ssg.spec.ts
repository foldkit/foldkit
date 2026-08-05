import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('ssg example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('serves every generated route without JavaScript', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    await page.goto('/')
    await expect(page.locator('#page-title')).toHaveText(
      'Statically generated home',
    )
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)

    await page.goto('/about/')
    await expect(page.locator('#page-title')).toHaveText(
      'Statically generated about page',
    )
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)

    await context.close()
  })

  test('hydrates the generated DOM and navigates as an application', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await page.getByRole('button', { name: 'Count: 0' }).click()
    await expect(page.getByRole('button', { name: 'Count: 1' })).toBeVisible()

    await page.getByRole('link', { name: 'About' }).click()
    await expect(page.locator('#page-title')).toHaveText(
      'Statically generated about page',
    )
    await expect(page).toHaveTitle('About | Static Generation | Foldkit')

    await page.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByRole('button', { name: 'Count: 1' })).toBeVisible()
  })
})
