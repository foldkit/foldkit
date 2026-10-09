import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const waitForClientRuntime = async (page: Page) => {
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)
  await expect(page.locator('[data-browser-environment-loaded]')).toHaveCount(1)
}

const distanceFromEnd = (container: Locator): Promise<number> =>
  container.evaluate(element => -element.scrollTop)

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
        element.scrollTop = -160
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

test('waits for upward scrolling before loading chat history in either mode', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
  await page.waitForTimeout(500)
  expect(await loadedChatMessageCount(page)).toBe(24)

  const historyMode = page.getByRole('radiogroup', { name: 'History mode' })
  await expect(historyMode).toHaveAccessibleDescription(
    'Switching modes restarts the demo.',
  )
  await expect(
    historyMode.getByRole('radio', { name: 'Infinite', exact: true }),
  ).toHaveAttribute('aria-checked', 'true')
  await historyMode.getByRole('radio', { name: 'Finite', exact: true }).click()
  await waitForInitialEnd(container)
  await page.waitForTimeout(500)
  expect(await loadedChatMessageCount(page)).toBe(24)
})

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

test('resolves delayed finite history and exposes its actual beginning', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
  const historyMode = page.getByRole('radiogroup', { name: 'History mode' })
  const finiteHistoryOption = historyMode.getByRole('radio', {
    name: 'Finite',
    exact: true,
  })
  await expect(finiteHistoryOption).toHaveAttribute('aria-checked', 'false')
  await finiteHistoryOption.click()
  await expect(finiteHistoryOption).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-virtual-list-chat-prepend]')).toHaveCount(0)
  await waitForInitialEnd(container)

  await container.evaluate(element => {
    element.scrollTop = -100
    element.dispatchEvent(new Event('scroll'))
  })
  await expect(page.locator('[data-virtual-list-chat-status]')).toContainText(
    'Loading older messages',
  )
  await expect.poll(() => loadedChatMessageCount(page)).toBeGreaterThan(24)

  await container.evaluate(element => {
    element.dispatchEvent(new Event('scrollend'))
  })
  await expect
    .poll(() =>
      container.evaluate(element =>
        Number(element.dataset['virtualListStartPadding']),
      ),
    )
    .toBe(1_200)

  await container.evaluate(element => {
    element.scrollTop = -element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })
  await expect(page.locator('[data-virtual-list-chat-status]')).toContainText(
    'Loading older messages',
  )
  await expect.poll(() => loadedChatMessageCount(page)).toBe(88)
  await expect(page.locator('[data-virtual-list-chat-prepend]')).toHaveCount(0)
  await expect(page.locator('[data-virtual-list-chat-status]')).toHaveText(
    'All older messages loaded',
  )
  await expect
    .poll(() =>
      container.evaluate(element =>
        Number(element.dataset['virtualListStartPadding']),
      ),
    )
    .toBe(0)

  await container.evaluate(element => {
    element.scrollTop = -element.scrollHeight
    element.dispatchEvent(new Event('scroll'))
  })
  await expect
    .poll(() =>
      container.evaluate(
        element =>
          element.scrollHeight - element.clientHeight + element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(1)
  await expect(
    container.locator('[data-virtual-list-item-index="0"]'),
  ).toBeVisible()
  expect(await loadedChatMessageCount(page)).toBe(88)
  await expect(
    container.locator('[data-virtual-list-item-index="0"]'),
  ).toHaveAttribute('aria-setsize', '88')
  await expect(
    container.locator('[data-virtual-list-item-index="0"]'),
  ).toHaveAttribute('aria-posinset', '1')

  await historyMode
    .getByRole('radio', { name: 'Infinite', exact: true })
    .click()
  await expect(finiteHistoryOption).toHaveAttribute('aria-checked', 'false')
  await expect.poll(() => loadedChatMessageCount(page)).toBe(24)
  await waitForInitialEnd(container)
  await expect(
    container.locator('[data-virtual-list-item-key]').first(),
  ).toHaveAttribute('aria-setsize', '-1')
})

test('keeps the history mode radio group stable while a page loads and ignores its late result after switching modes', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  const historyMode = page.getByRole('radiogroup', { name: 'History mode' })
  const finiteHistoryOption = historyMode.getByRole('radio', {
    name: 'Finite',
    exact: true,
  })
  await waitForInitialEnd(container)
  await finiteHistoryOption.click()
  await waitForInitialEnd(container)

  const optionElement = await finiteHistoryOption.elementHandle()
  await container.evaluate(element => {
    element.scrollTop = -100
    element.dispatchEvent(new Event('scroll'))
  })
  await expect(page.locator('[data-virtual-list-chat-status]')).toContainText(
    'Loading older messages',
  )
  expect(await optionElement?.evaluate(element => element.isConnected)).toBe(
    true,
  )
  await expect(finiteHistoryOption).not.toHaveAttribute('aria-disabled')
  expect(
    await finiteHistoryOption.evaluate(
      element => getComputedStyle(element).opacity,
    ),
  ).toBe('1')

  await finiteHistoryOption.press('ArrowLeft')
  await expect(
    historyMode.getByRole('radio', { name: 'Infinite', exact: true }),
  ).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => loadedChatMessageCount(page)).toBe(24)
  await page.waitForTimeout(300)
  expect(await loadedChatMessageCount(page)).toBe(24)
  await expect(
    container.locator('[data-virtual-list-item-key]').first(),
  ).toHaveAttribute('aria-setsize', '-1')
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

test('keeps a visible row stable when a lower row measures taller', async ({
  page,
}) => {
  await page.goto('/ui/virtual-list')
  await waitForClientRuntime(page)

  const container = page.getByRole('list', {
    name: 'End-anchored chat messages',
  })
  await waitForInitialEnd(container)
  await scrollAwayFromEnd(container)
  const anchor = await visibleAnchor(container)

  const growth = await container.evaluate((element, anchorIndex) => {
    const rows = Array.from(
      element.querySelectorAll<HTMLElement>('[data-virtual-list-item-index]'),
    )
    const rowBelow = rows.find(row => {
      const index = Number(row.getAttribute('data-virtual-list-item-index'))
      return Number.isFinite(index) && index > anchorIndex
    })
    if (rowBelow === undefined) {
      throw new Error('Expected a row below the visible anchor')
    }
    const key = rowBelow.getAttribute('data-virtual-list-item-key')
    if (key === null) {
      throw new Error('Expected a keyed row below the visible anchor')
    }
    const beforeHeight = rowBelow.getBoundingClientRect().height
    const message = rowBelow.querySelector<HTMLElement>(
      '[data-virtual-list-chat-message-id]',
    )
    if (message === null) {
      throw new Error('Expected a message below the visible anchor')
    }
    message.style.minHeight = `${beforeHeight + 80}px`
    return { key, beforeHeight }
  }, anchor.index)

  await expect
    .poll(() =>
      container
        .locator(`[data-virtual-list-item-key="${growth.key}"]`)
        .evaluate(element => element.getBoundingClientRect().height),
    )
    .not.toBe(growth.beforeHeight)
  await expectAnchorTop(container, anchor)
})
