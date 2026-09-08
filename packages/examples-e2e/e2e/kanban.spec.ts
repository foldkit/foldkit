import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('kanban example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('clicking "Add card" reveals the new card input', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Add card' }).first().click()
    await expect(page.getByPlaceholder('Card title...')).toBeVisible()
  })

  test('keyboard dragging preserves focus while moving a card', async ({
    page,
  }) => {
    await page.goto('/')

    const card = page.locator('[data-draggable-id="card-1"]')
    await card.focus()
    await card.press('Space')
    await page.keyboard.press('Tab')
    await expect(card).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(card).toBeFocused()
  })
})
