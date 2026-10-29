import { type Page, expect, test } from '@playwright/test'

import type { FixtureConfig } from './fixture/config'
import { ROW_COUNT, ROW_HEIGHT_PX, SHORT_ROW_COUNT } from './fixture/config'

type Scenario = Pick<FixtureConfig, 'scrollMode' | 'layout'>

const scenarios: ReadonlyArray<Scenario> = [
  { scrollMode: 'Self', layout: 'Absolute' },
  { scrollMode: 'Ancestor', layout: 'Spacers' },
  { scrollMode: 'Ancestor', layout: 'Absolute' },
  { scrollMode: 'Ancestor', layout: 'Table' },
  { scrollMode: 'Window', layout: 'Spacers' },
  { scrollMode: 'Window', layout: 'Absolute' },
  { scrollMode: 'Window', layout: 'Table' },
]

const rows = '[data-virtual-list-item-index]'

const openFixture = async (
  page: Page,
  scenario: Scenario,
  isDynamic = false,
) => {
  await page.goto(
    `/?scroll=${scenario.scrollMode}&layout=${scenario.layout}&dynamic=${isDynamic}`,
  )
  await expect(page.locator('#virtual-list')).toBeAttached()
  await expect(page.locator('#status')).not.toHaveAttribute(
    'data-measured-height',
    'unmeasured',
  )
}

const geometry = (page: Page, scenario: Scenario) =>
  page.evaluate(({ scrollMode }) => {
    const list = document.getElementById('virtual-list')
    const main = document.getElementById('main')

    if (list === null || main === null) {
      throw new Error('Fixture list or viewport is missing')
    }

    const listRect = list.getBoundingClientRect()
    const mainRect = main.getBoundingClientRect()
    const activeViewport = () => {
      if (scrollMode === 'Self') {
        return {
          top: listRect.top + list.clientTop,
          height: list.clientHeight,
          scrollTop: list.scrollTop,
        }
      } else if (scrollMode === 'Ancestor') {
        return {
          top: mainRect.top + main.clientTop,
          height: main.clientHeight,
          scrollTop: main.scrollTop,
        }
      } else {
        return { top: 0, height: window.innerHeight, scrollTop: window.scrollY }
      }
    }
    const viewport = activeViewport()

    return {
      viewportTop: viewport.top,
      viewportHeight: viewport.height,
      listTop: listRect.top + list.clientTop,
      listHeight: listRect.height,
      logicalScrollTop:
        scrollMode === 'Self'
          ? list.scrollTop
          : viewport.top - listRect.top - list.clientTop,
      mountedCount: list.querySelectorAll('[data-virtual-list-item-index]')
        .length,
      physicalScrollTop: viewport.scrollTop,
    }
  }, scenario)

const scrollToLogical = async (
  page: Page,
  scenario: Scenario,
  offset: number,
) => {
  await page.evaluate(
    ({ scrollMode, offset }) => {
      const list = document.getElementById('virtual-list')
      const main = document.getElementById('main')

      if (list === null || main === null) {
        throw new Error('Fixture list or viewport is missing')
      }

      if (scrollMode === 'Self') {
        list.scrollTop = offset
      } else if (scrollMode === 'Ancestor') {
        main.scrollTop +=
          list.getBoundingClientRect().top -
          main.getBoundingClientRect().top -
          main.clientTop +
          offset
      } else {
        window.scrollTo(
          0,
          window.scrollY + list.getBoundingClientRect().top + offset,
        )
      }
    },
    { ...scenario, offset },
  )

  await expect
    .poll(async () => {
      const actual = await geometry(page, scenario)
      const observed = Number(
        await page.locator('#status').getAttribute('data-scroll-top'),
      )

      return Math.abs(observed - actual.logicalScrollTop)
    })
    .toBeLessThan(2)
}

const expectRowAlignment = async (
  page: Page,
  scenario: Scenario,
  index: number,
  alignment: 'Start' | 'Center' | 'End',
) => {
  const row = page.locator(`[data-virtual-list-item-index="${index}"]`)
  await expect(row).toBeAttached()

  await expect
    .poll(async () => {
      const viewport = await geometry(page, scenario)
      const box = await row.boundingBox()

      if (box === null) {
        return Infinity
      }

      if (alignment === 'Start') {
        return Math.abs(box.y - viewport.viewportTop)
      } else if (alignment === 'Center') {
        return Math.abs(
          box.y +
            box.height / 2 -
            viewport.viewportTop -
            viewport.viewportHeight / 2,
        )
      } else {
        return Math.abs(
          box.y + box.height - viewport.viewportTop - viewport.viewportHeight,
        )
      }
    })
    .toBeLessThan(2)
}

const expectLogicalOrder = async (page: Page) => {
  const indexes = await page
    .locator(rows)
    .evaluateAll(elements =>
      elements.map(element =>
        Number(element.getAttribute('data-virtual-list-item-index')),
      ),
    )

  expect(indexes).toEqual([...indexes].sort((left, right) => left - right))
  expect(new Set(indexes).size).toBe(indexes.length)
}

const expectContainerOwnership = async (page: Page, scenario: Scenario) => {
  const styles = await page.evaluate(() => {
    const main = document.getElementById('main')
    const list = document.getElementById('virtual-list')

    if (main === null || list === null) {
      throw new Error('Fixture list or viewport is missing')
    }

    return {
      mainOverflow: main.style.overflow,
      mainPosition: main.style.position,
      mainOverflowAnchor: main.style.overflowAnchor,
      documentOverflowAnchor: document.documentElement.style.overflowAnchor,
      bodyOverflowAnchor: document.body.style.overflowAnchor,
      mainStyleProperties: [...main.style],
      listOverflowY: getComputedStyle(list).overflowY,
      listScrollTop: list.scrollTop,
    }
  })

  expect(styles.mainOverflow).toBe('')
  expect(styles.mainPosition).toBe('')
  expect(styles.mainOverflowAnchor).toBe('')
  expect(styles.documentOverflowAnchor).toBe('')
  expect(styles.bodyOverflowAnchor).toBe('')
  expect(styles.mainStyleProperties).toEqual(
    scenario.scrollMode === 'Ancestor' ? ['height'] : [],
  )

  if (scenario.scrollMode === 'Self') {
    expect(styles.listOverflowY).toBe('auto')
  } else {
    expect(['auto', 'scroll']).not.toContain(styles.listOverflowY)
    expect(styles.listScrollTop).toBe(0)
  }
}

for (const scenario of scenarios) {
  test(`${scenario.scrollMode} ${scenario.layout} uses logical coordinates and preserves document structure`, async ({
    page,
  }) => {
    const browserErrors: Array<string> = []
    page.on('pageerror', error => browserErrors.push(error.message))
    await openFixture(page, scenario)
    await expectContainerOwnership(page, scenario)

    if (scenario.scrollMode !== 'Self') {
      const initial = await geometry(page, scenario)
      expect(initial.logicalScrollTop).toBeLessThan(0)
      await expect
        .poll(async () =>
          Number(await page.locator('#status').getAttribute('data-scroll-top')),
        )
        .toBeLessThan(0)
      await expect(
        page.getByText('Content before the list', { exact: true }),
      ).toBeInViewport()

      await scrollToLogical(page, scenario, -initial.viewportHeight + 20)
      const partial = await geometry(page, scenario)
      const firstRowBox = await page
        .locator('[data-virtual-list-item-index="0"]')
        .boundingBox()
      expect(firstRowBox).not.toBeNull()
      expect(firstRowBox?.y).toBeGreaterThan(partial.viewportTop)
      expect(firstRowBox?.y).toBeLessThan(
        partial.viewportTop + partial.viewportHeight,
      )
      await page
        .getByRole('button', { name: 'Nearest first item', exact: true })
        .click()
      await expectRowAlignment(page, scenario, 0, 'End')
      const nearest = await geometry(page, scenario)
      expect(nearest.logicalScrollTop).toBeLessThan(0)
      expect(
        Math.abs(nearest.physicalScrollTop - partial.physicalScrollTop - 20),
      ).toBeLessThan(2)
    }

    await page.getByRole('button', { name: 'Index 120', exact: true }).click()
    await expectRowAlignment(page, scenario, 120, 'Start')
    await expectLogicalOrder(page)

    const viewport = await geometry(page, scenario)
    expect(viewport.mountedCount).toBeLessThanOrEqual(
      Math.ceil(viewport.viewportHeight / ROW_HEIGHT_PX) + 10,
    )

    if (scenario.scrollMode !== 'Self') {
      expect(
        Math.abs(viewport.listHeight - ROW_COUNT * ROW_HEIGHT_PX),
      ).toBeLessThan(2)
    }

    if (scenario.layout === 'Absolute') {
      await expect(
        page.locator('#virtual-list [aria-hidden="true"]'),
      ).toHaveCount(0)
      await expect(
        page.locator('[data-virtual-list-item-index="120"]'),
      ).toHaveCSS('position', 'absolute')
    }

    if (scenario.layout === 'Table') {
      await expect(page.locator('#virtual-list')).toHaveJSProperty(
        'tagName',
        'TBODY',
      )
      await expect(
        page.getByRole('table', { name: 'Fixture table' }),
      ).toHaveCount(1)
      await expect(page.getByRole('columnheader')).toHaveCount(2)
      await expect(page.locator('#virtual-list [role="listitem"]')).toHaveCount(
        0,
      )
      await expect(
        page.locator('[data-virtual-list-item-index="120"]'),
      ).toHaveAttribute('aria-rowindex', '122')
      await expect(
        page.locator('[data-virtual-list-item-index="120"] > td'),
      ).toHaveCount(2)
      const structure = await page
        .locator('#virtual-list')
        .evaluate(element => ({
          display: getComputedStyle(element).display,
          rowDisplays: [
            ...element.querySelectorAll('[data-virtual-list-item-index]'),
          ].map(row => getComputedStyle(row).display),
          spacerCells: [
            ...element.querySelectorAll('tr[aria-hidden="true"] > td'),
          ].map(cell => ({
            colspan: cell.getAttribute('colspan'),
            position: getComputedStyle(cell).position,
          })),
        }))
      expect(structure.display).toBe('table-row-group')
      expect(
        structure.rowDisplays.every(display => display === 'table-row'),
      ).toBe(true)
      expect(structure.spacerCells).toHaveLength(2)
      expect(
        structure.spacerCells.every(
          cell => cell.colspan === '2' && cell.position === 'static',
        ),
      ).toBe(true)
    }

    await page.getByRole('button', { name: 'Key 180', exact: true }).click()
    await expectRowAlignment(page, scenario, 180, 'Center')
    await page.getByRole('button', { name: 'Offset 2025', exact: true }).click()
    await expect
      .poll(async () =>
        Math.abs((await geometry(page, scenario)).logicalScrollTop - 2_025),
      )
      .toBeLessThan(2)

    if (scenario.scrollMode !== 'Self') {
      await page
        .getByRole('button', { name: 'Expand preceding content', exact: true })
        .click()
      await expect(page.locator('#preceding')).toHaveCSS('height', '960px')
      await expect
        .poll(async () => {
          const actual = await geometry(page, scenario)
          const observed = Number(
            await page.locator('#status').getAttribute('data-scroll-top'),
          )

          return Math.abs(actual.logicalScrollTop - observed)
        })
        .toBeLessThan(2)
      await page.getByRole('button', { name: 'Index 120', exact: true }).click()
      await expectRowAlignment(page, scenario, 120, 'Start')
    }

    await page.getByRole('button', { name: 'List end', exact: true }).click()
    await expectRowAlignment(page, scenario, ROW_COUNT - 1, 'End')
    await expectLogicalOrder(page)
    await expectContainerOwnership(page, scenario)

    await page
      .getByRole('button', { name: 'Offset negative', exact: true })
      .click()
    await expectRowAlignment(page, scenario, 0, 'Start')
    await expect
      .poll(async () =>
        Math.abs((await geometry(page, scenario)).logicalScrollTop),
      )
      .toBeLessThan(2)
    await page.getByRole('button', { name: 'Offset huge', exact: true }).click()
    await expectRowAlignment(page, scenario, ROW_COUNT - 1, 'End')

    if (scenario.scrollMode !== 'Self') {
      await scrollToLogical(page, scenario, ROW_COUNT * ROW_HEIGHT_PX + 100)
      await expect(
        page.getByText('Content after the list', { exact: true }),
      ).toBeInViewport()
    }

    expect(browserErrors).toEqual([])
  })

  test(`${scenario.scrollMode} ${scenario.layout} makes every row reachable with a bounded mounted slice`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-desktop',
      'The full traversal runs once per scroll and layout contract',
    )
    await openFixture(page, scenario)
    const seen = new Set<number>()
    const viewport = await geometry(page, scenario)
    const maximumMountedRows =
      Math.ceil(viewport.viewportHeight / ROW_HEIGHT_PX) + 10
    const stride = Math.max(
      ROW_HEIGHT_PX,
      viewport.viewportHeight - ROW_HEIGHT_PX * 2,
    )

    for (let offset = 0; offset < ROW_COUNT * ROW_HEIGHT_PX; offset += stride) {
      await scrollToLogical(page, scenario, offset)
      await expect
        .poll(async () => {
          const indexes = await page
            .locator(rows)
            .evaluateAll(elements =>
              elements.map(element =>
                Number(element.getAttribute('data-virtual-list-item-index')),
              ),
            )

          return indexes.some(
            index =>
              index >=
              Math.min(ROW_COUNT - 1, Math.floor(offset / ROW_HEIGHT_PX)),
          )
        })
        .toBe(true)

      const indexes = await page
        .locator(rows)
        .evaluateAll(elements =>
          elements.map(element =>
            Number(element.getAttribute('data-virtual-list-item-index')),
          ),
        )
      expect(indexes.length).toBeLessThanOrEqual(maximumMountedRows)

      for (const index of indexes) {
        seen.add(index)
      }
    }

    expect(seen.size).toBe(ROW_COUNT)
    await expectLogicalOrder(page)
  })
}

for (const scenario of [
  { scrollMode: 'Ancestor', layout: 'Absolute' },
  { scrollMode: 'Window', layout: 'Spacers' },
] satisfies ReadonlyArray<Scenario>) {
  test(`${scenario.scrollMode} preserves a measured row anchor through row and viewport resizing`, async ({
    page,
  }) => {
    await openFixture(page, scenario, true)
    await page.getByRole('button', { name: 'Index 120', exact: true }).click()
    await expectRowAlignment(page, scenario, 120, 'Start')
    const anchoredRow = page.locator('[data-virtual-list-item-index="120"]')
    await page
      .getByRole('button', { name: 'Expand preceding row', exact: true })
      .click()
    await expect(
      page.locator('[data-virtual-list-item-index="119"] .row-content'),
    ).toHaveClass(/expanded/)
    await expect
      .poll(async () =>
        Number(
          await page.locator('#status').getAttribute('data-measured-count'),
        ),
      )
      .toBeGreaterThan(0)
    await expectRowAlignment(page, scenario, 120, 'Start')

    if (scenario.scrollMode === 'Ancestor') {
      const originalHeight = Number(
        await page.locator('#status').getAttribute('data-measured-height'),
      )
      await page
        .getByRole('button', { name: 'Shrink viewport', exact: true })
        .click()
      await expect
        .poll(async () =>
          Number(
            await page.locator('#status').getAttribute('data-measured-height'),
          ),
        )
        .toBe(originalHeight - 80)
      await expectRowAlignment(page, scenario, 120, 'Start')
    }

    await page.setViewportSize({ width: 360, height: 640 })
    await expect
      .poll(async () => (await anchoredRow.boundingBox())?.height)
      .toBe(60)
    await expectRowAlignment(page, scenario, 120, 'Start')
    await page.getByRole('button', { name: 'List end', exact: true }).click()
    await expectRowAlignment(page, scenario, ROW_COUNT - 1, 'End')
  })
}

for (const scenario of scenarios.filter(
  scenario => scenario.scrollMode !== 'Self',
)) {
  test(`${scenario.scrollMode} ${scenario.layout} aligns an underfilled list end without changing pixel-offset clamping`, async ({
    page,
  }) => {
    await page.goto(
      `/?scroll=${scenario.scrollMode}&layout=${scenario.layout}&short=true&dynamic=true`,
    )
    await expect(page.locator('#status')).not.toHaveAttribute(
      'data-measured-height',
      'unmeasured',
    )
    await page.getByRole('button', { name: 'List end', exact: true }).click()
    await expectRowAlignment(page, scenario, SHORT_ROW_COUNT - 1, 'End')
    expect((await geometry(page, scenario)).logicalScrollTop).toBeLessThan(0)

    await page
      .getByRole('button', {
        name: `Expand item ${SHORT_ROW_COUNT - 1}`,
        exact: true,
      })
      .dispatchEvent('click')
    await expect(
      page.locator(
        `[data-virtual-list-item-index="${SHORT_ROW_COUNT - 1}"] .row-content`,
      ),
    ).toHaveClass(/expanded/)
    await expectRowAlignment(page, scenario, SHORT_ROW_COUNT - 1, 'End')

    await page.getByRole('button', { name: 'Offset huge', exact: true }).click()
    await expectRowAlignment(page, scenario, 0, 'Start')
  })
}

const externalScrollModes: ReadonlyArray<Scenario['scrollMode']> = [
  'Ancestor',
  'Window',
]

test('Ancestor absolute rows retain the visible anchor after preceding content moves and items change', async ({
  page,
}) => {
  const scenario: Scenario = { scrollMode: 'Ancestor', layout: 'Absolute' }
  await openFixture(page, scenario)
  await scrollToLogical(page, scenario, 2_025)
  await page
    .getByRole('button', { name: 'Expand preceding content', exact: true })
    .click()
  await expect(page.locator('#preceding')).toHaveCSS('height', '960px')
  await expect
    .poll(async () => {
      const actual = await geometry(page, scenario)
      const observed = Number(
        await page.locator('#status').getAttribute('data-scroll-top'),
      )

      return Math.abs(actual.logicalScrollTop - observed)
    })
    .toBeLessThan(2)

  const viewport = await geometry(page, scenario)
  const anchor = await page.locator(rows).evaluateAll((elements, viewport) => {
    const row = elements.find(element => {
      const rect = element.getBoundingClientRect()

      return (
        rect.bottom > viewport.viewportTop &&
        rect.top < viewport.viewportTop + viewport.viewportHeight
      )
    })

    if (row === undefined) {
      throw new Error('The fixture has no visible anchor row')
    }

    return {
      key: row.getAttribute('data-virtual-list-item-key'),
      top: row.getBoundingClientRect().top,
    }
  }, viewport)

  await page.getByRole('button', { name: 'Append item', exact: true }).click()
  await expect(page.locator('#status')).toHaveAttribute(
    'data-item-count',
    String(ROW_COUNT + 1),
  )
  await expect(page.locator('#status')).toHaveAttribute(
    'data-scroll-state',
    'Idle',
  )
  await expect
    .poll(async () => {
      const box = await page
        .locator(`[data-virtual-list-item-key="${anchor.key}"]`)
        .boundingBox()

      return box === null ? Infinity : Math.abs(box.y - anchor.top)
    })
    .toBeLessThan(2)
})

for (const scrollMode of externalScrollModes) {
  test(`${scrollMode} releases external listeners and observers when the list unmounts`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const activeListeners = new Map<
        EventTarget,
        Map<string, Set<EventListenerOrEventListenerObject>>
      >()
      const observerTargets = new Map<ResizeObserver, Set<Element>>()
      const originalAdd = EventTarget.prototype.addEventListener
      const originalRemove = EventTarget.prototype.removeEventListener
      const OriginalResizeObserver = window.ResizeObserver

      EventTarget.prototype.addEventListener = function (
        type,
        callback,
        options,
      ) {
        if ((type === 'scroll' || type === 'resize') && callback !== null) {
          const events =
            activeListeners.get(this) ??
            new Map<string, Set<EventListenerOrEventListenerObject>>()
          const listeners =
            events.get(type) ?? new Set<EventListenerOrEventListenerObject>()
          listeners.add(callback)
          events.set(type, listeners)
          activeListeners.set(this, events)
        }

        originalAdd.call(this, type, callback, options)
      }
      EventTarget.prototype.removeEventListener = function (
        type,
        callback,
        options,
      ) {
        if (callback !== null) {
          activeListeners.get(this)?.get(type)?.delete(callback)
        }

        originalRemove.call(this, type, callback, options)
      }
      window.ResizeObserver = class extends OriginalResizeObserver {
        override observe(target: Element, options?: ResizeObserverOptions) {
          const targets = observerTargets.get(this) ?? new Set<Element>()
          targets.add(target)
          observerTargets.set(this, targets)
          super.observe(target, options)
        }

        override unobserve(target: Element) {
          observerTargets.get(this)?.delete(target)
          super.unobserve(target)
        }

        override disconnect() {
          observerTargets.delete(this)
          super.disconnect()
        }
      }
      Reflect.set(window, '__virtualListResources', () => {
        const main = document.getElementById('main')
        const targets = [window, main]

        return {
          listeners: targets.reduce(
            (count, target) =>
              target === null
                ? count
                : count +
                  [...(activeListeners.get(target)?.values() ?? [])].reduce(
                    (sum, callbacks) => sum + callbacks.size,
                    0,
                  ),
            0,
          ),
          observers: [...observerTargets.values()].filter(observed =>
            [...observed].some(
              target =>
                target.id === 'virtual-list' ||
                target.id === 'main' ||
                target.hasAttribute('data-virtual-list-item-index'),
            ),
          ).length,
        }
      })
    })
    const scenario: Scenario = { scrollMode, layout: 'Spacers' }
    await openFixture(page, scenario, true)
    await expect
      .poll(() =>
        page.evaluate(
          () => Reflect.get(window, '__virtualListResources')().listeners,
        ),
      )
      .toBeGreaterThan(0)
    await expect
      .poll(() =>
        page.evaluate(
          () => Reflect.get(window, '__virtualListResources')().observers,
        ),
      )
      .toBeGreaterThan(0)
    await page
      .getByRole('button', { name: 'Unmount list', exact: true })
      .click()
    await expect(page.locator('#virtual-list')).toHaveCount(0)
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, '__virtualListResources')()),
      )
      .toEqual({ listeners: 0, observers: 0 })
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('scroll'))
      document.getElementById('main')?.dispatchEvent(new Event('scroll'))
    })
    await expect(page.locator('#status')).toHaveAttribute(
      'data-scroll-top',
      'unmounted',
    )
  })
}
