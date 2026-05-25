import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('counters example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('starts with three rows', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Counters (3)')
  })

  test('add row creates a new Counter row', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Add Counter' }).click()
    await expect(page).toHaveTitle('Counters (4)')
  })

  test('remove row drops the corresponding Counter', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await expect(page).toHaveTitle('Counters (2)')
  })

  test('increment is per-row independent', async ({ page }) => {
    await page.goto('/')
    const incrementButtons = page.getByRole('button', { name: '+' })
    await incrementButtons.first().click()
    await incrementButtons.first().click()
    await incrementButtons.nth(1).click()
    await expect(incrementButtons.first()).toBeVisible()
  })
})
