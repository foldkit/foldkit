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
  await page.locator('[data-virtual-list-chat-append]').click()
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
  await page.locator('[data-virtual-list-chat-append]').click()
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
})
