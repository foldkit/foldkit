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

  test('opens the menu when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Menu', exact: true }).first().click()
    await expect(page).toHaveURL(/\/menu$/)

    const trigger = page.locator('#menu-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="menu-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the popover when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Popover', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/popover$/)

    const trigger = page.locator('#popover-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="popover-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the date picker when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Date Picker', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/date-picker$/)

    const trigger = page.locator('#date-picker-basic-demo-popover-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page
      .locator('label[for="date-picker-basic-demo-popover-button"]')
      .click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('opens the disclosure when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Disclosure', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/disclosure$/)

    const trigger = page.locator('#disclosure-basic-demo-button')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="disclosure-basic-demo-button"]').click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  test('focuses the combobox input when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Combobox', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/combobox$/)

    const trigger = page.locator('#combobox-demo-input')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await page.locator('label[for="combobox-demo-input"]').click()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('focuses the tooltip trigger when its external label is clicked', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: 'Tooltip', exact: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/tooltip$/)

    const trigger = page.locator('#tooltip-basic-demo-trigger')

    await page.locator('label[for="tooltip-basic-demo-trigger"]').click()
    await expect(trigger).toBeFocused()
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
