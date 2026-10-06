import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const waitForClientRuntime = async (page: Page) => {
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)
  await expect(page.locator('[data-browser-environment-loaded]')).toHaveCount(1)
}

const distanceFromEnd = (container: Locator): Promise<number> =>
  container.evaluate(
    element => element.scrollHeight - element.clientHeight - element.scrollTop,
  )

type VisibleAnchor = Readonly<{ key: string; top: number; index: number }>

const visibleAnchor = (container: Locator): Promise<VisibleAnchor> =>
  container.evaluate(element => {
    const containerRect = element.getBoundingClientRect()
    const rows = Array.from(
      element.querySelectorAll<HTMLElement>('[data-virtual-list-item-key]'),
    )
    const row = rows.find(row => {
      const rect = row.getBoundingClientRect()
      return rect.bottom > containerRect.top && rect.top < containerRect.bottom
    })
    if (row === undefined) {
      throw new Error('Expected a visible VirtualList row')
    }

    const key = row.getAttribute('data-virtual-list-item-key')
    const index = Number(row.getAttribute('data-virtual-list-item-index'))
    if (key === null || !Number.isFinite(index)) {
      throw new Error('Expected a keyed VirtualList row')
    }
    return {
      key,
      index,
      top: row.getBoundingClientRect().top - containerRect.top,
    }
  })

const scrollAwayFromEnd = async (container: Locator) => {
  await container.evaluate(
    element =>
      new Promise<void>(resolve => {
        element.scrollTop = Math.max(
          0,
          element.scrollHeight - element.clientHeight - 160,
        )
        element.dispatchEvent(new Event('scroll'))
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await expect.poll(() => distanceFromEnd(container)).toBeGreaterThan(100)
}

const expectAnchorTop = async (container: Locator, anchor: VisibleAnchor) => {
  await expect
    .poll(() =>
      container.evaluate((element, { key, top }) => {
        const row = Array.from(
          element.querySelectorAll<HTMLElement>('[data-virtual-list-item-key]'),
        ).find(row => row.getAttribute('data-virtual-list-item-key') === key)
        return row === undefined
          ? Number.POSITIVE_INFINITY
          : Math.abs(
              row.getBoundingClientRect().top -
                element.getBoundingClientRect().top -
                top,
            )
      }, anchor),
    )
    .toBeLessThanOrEqual(1)
}

test('keeps end-anchored dynamic lists stable across append, prepend, and row growth', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await expect(
    container.locator('[data-virtual-list-item-key]'),
  ).not.toHaveCount(0)
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)

  await scrollAwayFromEnd(container)
  const prependAnchor = await visibleAnchor(container)
  await page.locator('[data-virtual-list-chat-prepend]').click()
  await expectAnchorTop(container, prependAnchor)

  const appendAnchor = await visibleAnchor(container)
  await page.getByRole('button', { name: 'Add message' }).click()
  await expectAnchorTop(container, appendAnchor)

  const growthAnchor = await visibleAnchor(container)
  await container.evaluate((element, anchorIndex) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLElement>('[data-virtual-list-item-index]'),
    )
    const rowAbove = rows.find(row => {
      const index = Number(row.getAttribute('data-virtual-list-item-index'))
      return Number.isFinite(index) && index < anchorIndex
    })
    rowAbove
      ?.querySelector<HTMLElement>('[data-virtual-list-chat-message-id]')
      ?.click()
  }, growthAnchor.index)
  await expectAnchorTop(container, growthAnchor)

  await container.evaluate(element => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Add message' }).click()
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
})

test('loads older messages when scrolling near the start and preserves the visible row', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
  const initialScrollHeight = await container.evaluate(
    element => element.scrollHeight,
  )

  await container.evaluate(element => {
    element.scrollTop = 120
    element.dispatchEvent(new Event('scroll'))
  })
  await expect(
    container.locator('[data-virtual-list-item-key="0"]'),
  ).toHaveCount(1)

  const startAnchor = await container.evaluate(element => {
    element.scrollTop = 40
    const row = element.querySelector<HTMLElement>(
      '[data-virtual-list-item-key="0"]',
    )
    if (row === null) {
      throw new Error('Expected the first row to be rendered')
    }
    const top =
      row.getBoundingClientRect().top - element.getBoundingClientRect().top
    element.dispatchEvent(new Event('scroll'))
    return { key: '0', top, index: 0 }
  })

  await expect
    .poll(() => container.evaluate(element => element.scrollHeight))
    .toBeGreaterThan(initialScrollHeight + 200)
  await expectAnchorTop(container, startAnchor)
})

test('loads older messages after jumping directly from the end to the start', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)

  await container.evaluate(element => {
    element.scrollTop = 0
    element.dispatchEvent(new Event('scroll'))
  })

  await expect(
    container.locator('[data-virtual-list-item-key="-8"]'),
  ).toHaveCount(1)
  await expect
    .poll(() => container.evaluate(element => element.scrollTop))
    .toBeLessThanOrEqual(1)
})

test('keeps a distant key centered while correcting a low row-height estimate', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
  await page.locator('[data-virtual-list-chat-scroll-to-message]').click()

  await expect
    .poll(() =>
      container.evaluate(element => {
        const row = element.querySelector<HTMLElement>(
          '[data-virtual-list-item-key="7"]',
        )
        if (row === null) {
          return Number.POSITIVE_INFINITY
        }
        const containerRect = element.getBoundingClientRect()
        const rowRect = row.getBoundingClientRect()
        return Math.abs(
          (rowRect.top + rowRect.bottom) / 2 -
            (containerRect.top + containerRect.bottom) / 2,
        )
      }),
    )
    .toBeLessThanOrEqual(1)
})
