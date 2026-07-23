import { type Page as PlaywrightPage, expect, test } from '@playwright/test'

import * as Page from '../page'

const addTask = async (page: PlaywrightPage, text: string): Promise<void> => {
  await page.getByPlaceholder('Add a task...').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText(text)).toBeVisible()
}

test.describe('cross-tab-tasks example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('adds a task through the full store round-trip', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'Write Playwright tests')
  })

  test('persists tasks across a reload', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'Survive a refresh')

    await page.reload()
    await expect(page.getByText('Survive a refresh')).toBeVisible()
  })

  test('toggles a task complete', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'Toggle me')

    const checkbox = page.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })

  test('deletes a task', async ({ page }) => {
    await page.goto('/')
    await addTask(page, 'Delete me')

    await page.getByRole('button', { name: 'Delete Delete me' }).click()
    await expect(page.getByText('Delete me')).toBeHidden()
  })

  test('syncs a new task live to another tab', async ({ context }) => {
    const firstTab = await context.newPage()
    await firstTab.goto('/')

    const secondTab = await context.newPage()
    await secondTab.goto('/')

    await addTask(firstTab, 'Shared across tabs')

    await expect(secondTab.getByText('Shared across tabs')).toBeVisible()
  })
})
