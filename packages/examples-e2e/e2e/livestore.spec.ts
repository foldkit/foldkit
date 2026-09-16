import { type Page as PlaywrightPage, expect, test } from '@playwright/test'

import * as Page from '../page'

const addTask = async (page: PlaywrightPage, text: string): Promise<void> => {
  await page.getByPlaceholder('Add a task...').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText(text)).toBeVisible()
}

test.describe('LiveStore example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page, {
      readyLocator: page.getByText('No tasks yet. Add one above!'),
      waitUntil: 'load',
    })
  })

  test('adds a task through the LiveStore round-trip', async ({ page }) => {
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

  test('syncs task mutations live across tabs', async ({ context }) => {
    const firstTab = await context.newPage()
    await firstTab.goto('/')

    const secondTab = await context.newPage()
    await secondTab.goto('/')

    await addTask(firstTab, 'Shared across tabs')

    await expect(secondTab.getByText('Shared across tabs')).toBeVisible()

    await firstTab.getByRole('checkbox').click()
    await expect(secondTab.getByRole('checkbox')).toBeChecked()

    await secondTab.getByRole('button', { name: 'Clear 1 completed' }).click()
    await expect(firstTab.getByText('Shared across tabs')).toBeHidden()

    await addTask(secondTab, 'Delete across tabs')
    await expect(firstTab.getByText('Delete across tabs')).toBeVisible()

    await firstTab
      .getByRole('button', { name: 'Delete Delete across tabs' })
      .click()
    await expect(secondTab.getByText('Delete across tabs')).toBeHidden()
  })
})
