import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('counters example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('starts with three counter instances', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Counters (3)')
  })

  test('adds a new counter instance', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Add Counter' }).click()
    await expect(page).toHaveTitle('Counters (4)')
  })

  test('removes the corresponding counter instance', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await expect(page).toHaveTitle('Counters (2)')
  })

  test('increments separate counter instances', async ({ page }) => {
    await page.goto('/')
    const incrementButtons = page.getByRole('button', { name: '+' })
    await incrementButtons.first().click()
    await incrementButtons.first().click()
    await incrementButtons.nth(1).click()
    await expect(incrementButtons.first()).toBeVisible()
  })
})
