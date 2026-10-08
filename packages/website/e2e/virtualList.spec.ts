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

const waitForInitialEnd = async (container: Locator) => {
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
  await container.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
}

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

const loadedChatMessageCount = async (page: Page): Promise<number> =>
  Number.parseInt(
    (await page
      .getByText(/messages · Click to expand a message/)
      .textContent()) ?? '',
    10,
  )

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
  await waitForInitialEnd(container)
  await expect(
    container.locator('[data-virtual-list-item-key]').first(),
  ).toHaveAttribute('aria-setsize', '-1')

  await scrollAwayFromEnd(container)
  const prependAnchor = await visibleAnchor(container)
  await page.locator('[data-virtual-list-chat-prepend]').click()
  await expectAnchorTop(container, prependAnchor)
  await expect(page.locator('[data-virtual-list-chat-status]')).toContainText(
    'older messages',
  )

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
  await waitForInitialEnd(container)
  await page.getByRole('button', { name: 'Add message' }).click()
  await expect.poll(() => distanceFromEnd(container)).toBeLessThanOrEqual(1)
})

test('loads beyond the initial runway across upward scrolls', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
  expect(await loadedChatMessageCount(page)).toBe(24)
  await expect(
    container.locator('[data-virtual-list-item-key]').first(),
  ).toHaveAttribute('aria-setsize', '-1')
  await container.evaluate(element => {
    element.addEventListener(
      'scrollend',
      event => {
        if (element.dataset['allowScrollEnd'] !== 'true') {
          event.stopImmediatePropagation()
        }
      },
      { capture: true },
    )
  })

  const initialScrollHeight = await container.evaluate(
    element => element.scrollHeight,
  )

  const startAnchor = await container.evaluate(element => {
    element.scrollTop -= 20
    const containerRect = element.getBoundingClientRect()
    const row = Array.from(
      element.querySelectorAll<HTMLElement>('[data-virtual-list-item-key]'),
    ).find(row => {
      const rect = row.getBoundingClientRect()
      return rect.bottom > containerRect.top && rect.top < containerRect.bottom
    })
    if (row === undefined) {
      throw new Error('Expected a visible keyed row near the start')
    }
    const key = row.getAttribute('data-virtual-list-item-key')
    const index = Number(row.getAttribute('data-virtual-list-item-index'))
    if (key === null || !Number.isFinite(index)) {
      throw new Error('Expected a visible keyed row near the start')
    }

    const nativeScrollTo = element.scrollTo
    Object.defineProperty(element, 'scrollTo', {
      configurable: true,
      value: (...args: Array<unknown>) => {
        const calls = Number(element.dataset['scriptScrollCalls'] ?? '0')
        element.dataset['scriptScrollCalls'] = String(calls + 1)
        return Reflect.apply(nativeScrollTo, element, args)
      },
    })

    const top =
      row.getBoundingClientRect().top - element.getBoundingClientRect().top
    element.dispatchEvent(new Event('scroll'))
    return { key, top, index }
  })

  await expect.poll(() => loadedChatMessageCount(page)).toBeGreaterThan(24)
  const firstLoadedCount = await loadedChatMessageCount(page)
  await expect
    .poll(() => container.evaluate(element => element.scrollHeight))
    .toBeLessThanOrEqual(initialScrollHeight + 100)
  await expectAnchorTop(container, startAnchor)
  await expect
    .poll(() =>
      container.evaluate(element =>
        Number(element.dataset['scriptScrollCalls'] ?? '0'),
      ),
    )
    .toBe(0)
  const secondAnchor = await container.evaluate(element => {
    element.scrollTop =
      Number(element.dataset['virtualListStartPadding']) +
      element.clientHeight * 3 -
      20
    const containerRect = element.getBoundingClientRect()
    const row = Array.from(
      element.querySelectorAll<HTMLElement>('[data-virtual-list-item-key]'),
    ).find(row => {
      const rect = row.getBoundingClientRect()
      return rect.bottom > containerRect.top && rect.top < containerRect.bottom
    })
    element.dispatchEvent(new Event('scroll'))
    if (row === undefined) {
      return undefined
    }
    return {
      key: row.getAttribute('data-virtual-list-item-key') ?? '',
      index: Number(row.getAttribute('data-virtual-list-item-index')),
      top: row.getBoundingClientRect().top - containerRect.top,
    }
  })
  await expect
    .poll(() => loadedChatMessageCount(page))
    .toBeGreaterThan(firstLoadedCount)
  await expect
    .poll(() => container.evaluate(element => element.scrollHeight))
    .toBeLessThanOrEqual(initialScrollHeight + 100)
  if (secondAnchor !== undefined) {
    await expectAnchorTop(container, secondAnchor)
  }
  await expect
    .poll(() =>
      container.evaluate(element =>
        Number(element.dataset['scriptScrollCalls'] ?? '0'),
      ),
    )
    .toBe(0)

  for (const gestureNumber of [1, 2, 3, 4, 5]) {
    const countBeforeGesture = await loadedChatMessageCount(page)
    const scrollCallsBeforeGesture = await container.evaluate(element =>
      Number(element.dataset['scriptScrollCalls'] ?? '0'),
    )

    await container.evaluate(element => {
      element.scrollTop =
        Number(element.dataset['virtualListStartPadding']) - 5000
      element.dispatchEvent(new Event('scroll'))
    })
    await expect
      .poll(() => loadedChatMessageCount(page))
      .toBeGreaterThan(countBeforeGesture + 80)
    const anchor = await visibleAnchor(container)
    await expect
      .poll(() =>
        container.evaluate(element =>
          Number(element.dataset['scriptScrollCalls'] ?? '0'),
        ),
      )
      .toBe(scrollCallsBeforeGesture)

    await container.evaluate(element => {
      element.dataset['allowScrollEnd'] = 'true'
      element.dispatchEvent(new Event('scrollend'))
      element.dataset['allowScrollEnd'] = 'false'
    })
    await expect
      .poll(() =>
        container.evaluate(element =>
          Number(element.dataset['virtualListStartPadding']),
        ),
      )
      .toBe(100_000)
    await expectAnchorTop(container, anchor)
    await expect
      .poll(() =>
        container.evaluate(element =>
          Number(element.dataset['scriptScrollCalls'] ?? '0'),
        ),
      )
      .toBeGreaterThan(scrollCallsBeforeGesture)
    expect(await loadedChatMessageCount(page)).toBeGreaterThan(
      24 + gestureNumber * 80,
    )
  }
  expect(await loadedChatMessageCount(page)).toBeGreaterThan(504)
  expect(
    await container.locator('[data-virtual-list-item-key]').count(),
  ).toBeLessThan(80)
  await expect(page.locator('[data-virtual-list-chat-status]')).toContainText(
    'older messages',
  )
})

test('keeps the focused message mounted when older history is prepended', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
  const message = container
    .locator('[data-virtual-list-chat-message-id]')
    .last()
  const id = await message.getAttribute('data-virtual-list-chat-message-id')
  await message.focus()

  await page.locator('[data-virtual-list-chat-prepend]').evaluate(element => {
    if (element instanceof HTMLElement) {
      element.click()
    }
  })

  await expect(
    container.locator(`[data-virtual-list-chat-message-id="${id}"]`),
  ).toBeFocused()
})

test('keeps a distant key centered while correcting a low row-height estimate', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
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
