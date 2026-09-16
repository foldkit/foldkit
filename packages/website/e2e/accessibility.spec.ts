import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const accessibilityTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
]

const expectNoAccessibilityViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(accessibilityTags)
    .analyze()

  expect(results.violations).toEqual([])
}

const waitForClientRuntime = async (page: Page) => {
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)
  await expect(page.locator('[data-browser-environment-loaded]')).toHaveCount(1)
}

const waitForRuntimeEffects = async (page: Page) => {
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

const isWithinInertSubtree = (locator: Locator): Promise<boolean> =>
  locator.evaluate(element => element.closest('[inert]') !== null)

test('keeps representative UI demos free of automated accessibility violations', async ({
  page,
}) => {
  for (const path of ['/ui/drag-and-drop', '/ui/virtual-list']) {
    await page.goto(path)
    await waitForClientRuntime(page)
    await expectNoAccessibilityViolations(page)
  }

  await page.goto('/ui/dialog')
  await waitForClientRuntime(page)
  await page.getByRole('button', { name: 'Open Dialog', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Confirm Action' }),
  ).toBeVisible()
  await expectNoAccessibilityViolations(page)
})

test('announces keyboard drag state and the committed reorder', async ({
  page,
}) => {
  await page.goto('/ui/drag-and-drop')
  await waitForClientRuntime(page)

  const liveRegion = page.locator('[aria-live="assertive"]')
  const card = page.locator('[data-draggable-id="card-1"]')

  await card.focus()
  await card.press('Space')
  await expect(liveRegion).toHaveText(/Picked up Design API/)
  await expect(card).toBeFocused()
  await waitForRuntimeEffects(page)

  await card.press('ArrowDown')
  await expect(liveRegion).toHaveText('Position 2 in Backlog.')

  await card.press('Space')
  await expect(liveRegion).toHaveText(
    'Dropped Design API in position 2 of Backlog.',
  )
})

test('makes scrollable tables and virtual-list demos reachable by keyboard', async ({
  page,
}) => {
  await page.goto('/ui/combobox')
  await waitForClientRuntime(page)
  const table = page.locator('div.overflow-x-auto[tabindex="0"]').first()
  await expect(table).toBeVisible()
  await expect(table).toHaveAttribute('role', 'region')
  await expect(table).toHaveAttribute('aria-label', /^Table: /)

  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)
  await expect(
    page.getByRole('list', { name: 'Activity events', exact: true }),
  ).toHaveAttribute('tabindex', '0')
  await expect(
    page.getByRole('list', { name: 'Variable-height activity events' }),
  ).toHaveAttribute('tabindex', '0')
})

test('marks an opened dialog modal and restores its background after close', async ({
  page,
}) => {
  await page.goto('/ui/dialog')
  await waitForClientRuntime(page)

  const trigger = page.getByRole('button', {
    name: 'Open Dialog',
    exact: true,
  })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Confirm Action' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  const header = page.locator('header')
  await expect.poll(() => isWithinInertSubtree(header)).toBe(true)

  const devtools = page.locator('#foldkit-devtools')
  if ((await devtools.count()) > 0) {
    await expect.poll(() => isWithinInertSubtree(devtools)).toBe(false)
  }

  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(() => isWithinInertSubtree(header)).toBe(false)
})
