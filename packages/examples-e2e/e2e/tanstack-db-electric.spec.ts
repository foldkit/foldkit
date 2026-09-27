import { type Page as PlaywrightPage, expect, test } from '@playwright/test'

import * as Page from '../page'

const addTask = async (page: PlaywrightPage, text: string): Promise<void> => {
  await page.getByPlaceholder('Add a task...').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText(text)).toBeVisible()
}

const clearTasks = async (page: PlaywrightPage): Promise<void> => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'TanStack DB + ElectricSQL' }),
  ).toBeVisible()

  const deleteButtons = page.getByRole('button', { name: /^Delete / })
  const deleteButtonCount = await deleteButtons.count()
  for (
    let deletionIndex = 0;
    deletionIndex < deleteButtonCount;
    deletionIndex++
  ) {
    await deleteButtons.first().click()
    await expect(deleteButtons).toHaveCount(
      deleteButtonCount - deletionIndex - 1,
    )
  }
}

test.describe('TanStack DB + ElectricSQL example', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => clearTasks(page))

  test('opens with an empty task list and no page errors', async ({ page }) => {
    await Page.assertLoadedCleanly(page, {
      readyLocator: page.getByText('No tasks yet. Add one above!'),
      waitUntil: 'load',
    })
  })

  test('adds a task', async ({ page }) => {
    await addTask(page, 'Write Playwright tests')
  })

  test('keeps added tasks after a reload', async ({ page }) => {
    await addTask(page, 'Survive a refresh')

    await page.reload()
    await expect(page.getByText('Survive a refresh')).toBeVisible()
  })

  test('marks a task as completed', async ({ page }) => {
    await addTask(page, 'Toggle me')

    const checkbox = page.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })

  test('removes a deleted task', async ({ page }) => {
    await addTask(page, 'Delete me')

    await page.getByRole('button', { name: 'Delete Delete me' }).click()
    await expect(page.getByText('Delete me')).toBeHidden()
  })

  test('treats a missing-row delete as already complete', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          _tag: 'DeleteItems',
          ids: ['already-deleted'],
        }),
      })
      const body: unknown = await response.json()

      return {
        status: response.status,
        body,
      }
    })

    expect(result).toStrictEqual({
      status: 200,
      body: { _tag: 'Unchanged' },
    })
  })

  test('rejects malformed write requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      })
      const body: unknown = await response.json()

      return {
        status: response.status,
        body,
      }
    })

    expect(result).toStrictEqual({
      status: 400,
      body: { error: 'Invalid request body' },
    })
  })

  test('reports conflicting writes without exposing database details', async ({
    page,
  }) => {
    const result = await page.evaluate(async () => {
      const mutation = {
        _tag: 'AddItems',
        items: [
          {
            id: 'duplicate-item',
            text: 'Duplicate item',
            isCompleted: false,
            createdAt: Date.now(),
          },
        ],
      }
      const firstResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mutation),
      })
      const secondResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mutation),
      })

      return {
        firstStatus: firstResponse.status,
        secondStatus: secondResponse.status,
        secondBody: await secondResponse.json(),
      }
    })

    expect(result).toStrictEqual({
      firstStatus: 200,
      secondStatus: 409,
      secondBody: { error: 'An item with that ID already exists' },
    })
  })

  test('preserves concurrent toggle intent across tabs', async ({
    page,
    context,
  }) => {
    await addTask(page, 'Toggle twice')

    const secondTab = await context.newPage()
    await secondTab.goto('/')
    await expect(secondTab.getByText('Toggle twice')).toBeVisible()

    await Promise.all([
      page.getByRole('checkbox').click(),
      secondTab.getByRole('checkbox').click(),
    ])

    await expect(page.getByRole('checkbox')).not.toBeChecked()
    await expect(secondTab.getByRole('checkbox')).not.toBeChecked()
  })

  test('reflects task changes across open tabs', async ({ context }) => {
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
