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

  test('releases the scroll lock when navigating away from an open dialog', async ({
    page,
  }) => {
    const documentOverflow = () =>
      page.evaluate(() => document.documentElement.style.overflow)

    await page.goto('/')
    await page
      .getByRole('link', { name: 'Dialog', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/dialog$/)

    await page.getByRole('button', { name: 'Open Dialog', exact: true }).click()
    await expect.poll(documentOverflow).toBe('hidden')

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(documentOverflow).not.toBe('hidden')
  })
})
