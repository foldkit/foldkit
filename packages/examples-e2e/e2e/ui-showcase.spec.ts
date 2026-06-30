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

  test('opens the listbox when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Listbox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/listbox$/)

    const trigger = page.locator('#listbox-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.getByText('Family member', { exact: true }).click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
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
