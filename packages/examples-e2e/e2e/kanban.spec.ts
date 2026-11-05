import {
  type Page as BrowserPage,
  type Locator,
  expect,
  test,
} from '@playwright/test'

import * as Page from '../page'

const cardOrder = (list: Locator) =>
  list
    .locator('[data-draggable-id]')
    .evaluateAll(cards =>
      cards.map(card => card.getAttribute('data-draggable-id')),
    )

const pointerDrop = async (
  page: BrowserPage,
  targetId: string,
  fraction: number,
  columnName: string,
  previousId: string | null,
  isSecondSample = false,
) => {
  const source = page.locator('[data-draggable-id="card-1"]')
  const target = page.locator(`[data-draggable-id="${targetId}"]`)
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (!sourceBox || !targetBox) {
    throw new Error('Cards must have browser geometry')
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  )
  await page.mouse.down()
  await page.waitForFunction(() =>
    Array.from(document.head.querySelectorAll('style')).some(style =>
      style.textContent?.includes('cursor: grabbing !important'),
    ),
  )
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height * fraction,
    { steps: 1 },
  )

  const list = page.getByRole('listbox', { name: columnName, exact: true })
  const placeholder = list.locator('li:not([data-sortable-id])')
  await expect(placeholder).toHaveCount(1)
  if (isSecondSample) {
    const previewTargetBox = await target.boundingBox()
    if (!previewTargetBox) {
      throw new Error('Target must remain visible after preview')
    }
    await page.mouse.move(
      previewTargetBox.x + previewTargetBox.width / 2,
      previewTargetBox.y + previewTargetBox.height * fraction,
      { steps: 1 },
    )
  }
  await expect
    .configure({ soft: true })
    .poll(() =>
      placeholder.evaluate(
        element =>
          element.previousElementSibling?.getAttribute('data-sortable-id') ??
          null,
      ),
    )
    .toBe(previousId)
  await page.mouse.up()
}

test.describe('kanban example', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('kanban-board'))
  })

  test('pointer single activating sample previews and drops after card 2', async ({
    page,
  }) => {
    await page.goto('/')
    await pointerDrop(page, 'card-2', 0.75, 'To Do', 'card-2')
    await expect
      .soft(page.locator('[aria-live="assertive"]'))
      .toHaveText(
        'Dropped Research drag-and-drop patterns in position 2 of To Do.',
      )
    expect(
      await cardOrder(
        page.getByRole('listbox', { name: 'To Do', exact: true }),
      ),
    ).toEqual(['card-2', 'card-1', 'card-3', 'card-4', 'card-5', 'card-6'])
  })
  test('pointer second sample preserves the slot after preview removes the source', async ({
    page,
  }) => {
    await page.goto('/')
    await pointerDrop(page, 'card-2', 0.75, 'To Do', 'card-2', true)
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      'Dropped Research drag-and-drop patterns in position 2 of To Do.',
    )
    expect(
      await cardOrder(
        page.getByRole('listbox', { name: 'To Do', exact: true }),
      ),
    ).toEqual(['card-2', 'card-1', 'card-3', 'card-4', 'card-5', 'card-6'])
  })

  for (const fraction of [0.25, 0.75]) {
    test(`pointer self drop at ${fraction} keeps its source slot`, async ({
      page,
    }) => {
      await page.goto('/')
      await pointerDrop(page, 'card-1', fraction, 'To Do', null)
      await expect(page.locator('[aria-live="assertive"]')).toHaveText(
        'Dropped Research drag-and-drop patterns in position 1 of To Do.',
      )
      expect(
        await cardOrder(
          page.getByRole('listbox', { name: 'To Do', exact: true }),
        ),
      ).toEqual(['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'])
    })
  }

  test('pointer tail announces the exact last position', async ({ page }) => {
    await page.goto('/')
    await pointerDrop(page, 'card-6', 0.9, 'To Do', 'card-6')
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      'Dropped Research drag-and-drop patterns in position 6 of To Do.',
    )
    expect(
      await cardOrder(
        page.getByRole('listbox', { name: 'To Do', exact: true }),
      ),
    ).toEqual(['card-2', 'card-3', 'card-4', 'card-5', 'card-6', 'card-1'])
  })

  test('pointer cross-container preserves destination index', async ({
    page,
  }) => {
    await page.goto('/')
    await pointerDrop(page, 'card-7', 0.25, 'In Progress', null)
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      'Dropped Research drag-and-drop patterns in position 1 of In Progress.',
    )
    expect(
      (
        await cardOrder(
          page.getByRole('listbox', { name: 'In Progress', exact: true }),
        )
      ).at(0),
    ).toBe('card-1')
    expect(
      await cardOrder(
        page.getByRole('listbox', { name: 'To Do', exact: true }),
      ),
    ).toEqual(['card-2', 'card-3', 'card-4', 'card-5', 'card-6'])
  })

  test('keyboard uses the same slot after card 2', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('[data-draggable-id="card-1"]')
    await card.focus()
    await card.press('Space')
    await expect(page.locator('[aria-live="assertive"]')).toContainText(
      'Picked up',
    )
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      'Position 2 in To Do.',
    )
    await expect(card).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      'Dropped Research drag-and-drop patterns in position 2 of To Do.',
    )
    expect(
      await cardOrder(
        page.getByRole('listbox', { name: 'To Do', exact: true }),
      ),
    ).toEqual(['card-2', 'card-1', 'card-3', 'card-4', 'card-5', 'card-6'])
    await expect(card).toBeFocused()
  })

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
