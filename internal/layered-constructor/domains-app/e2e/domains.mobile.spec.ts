import { Array, Effect, String } from 'effect'

import { devices, expect, test } from '@playwright/test'

import { makeDomainFixtures } from '../src/shared/domain.fixture'
import { supportedTlds } from '../src/shared/tld'
import { mockDomainSearch } from './api'
import { chooseFilterOption } from './page'

test.beforeEach(async ({ page }) => {
  await mockDomainSearch(page)
})

const MIN_TOUCH_TARGET_SIZE_PX = 44
const PHONE_VIEWPORTS = [
  { name: 'narrow portrait', width: 320, height: 568 },
  { name: 'portrait', width: 390, height: 664 },
  { name: 'landscape', width: 844, height: 390 },
]

for (const { name, width, height } of PHONE_VIEWPORTS) {
  test(`mobile search supports focus, viewport changes, filters, and clearing in ${name}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    if (baseURL === undefined) {
      throw new Error('The domain example requires a base URL')
    }

    const context = await browser.newContext({
      ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
      viewport: { width, height },
      baseURL,
    })
    const page = await context.newPage()
    await mockDomainSearch(page)
    const errors: Array<string> = []
    page.on('pageerror', error => errors.push(error.message))

    try {
      await page.goto('/')
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      await expect(input).not.toBeFocused()
      await expect(input).toHaveCSS('font-size', '16px')
      await expect(input).toHaveAttribute('enterkeyhint', 'search')
      const originalInput = await input.elementHandle()
      await input.tap()
      await expect(input).toBeFocused()
      await input.fill('mobile-idea')
      await expect(page.locator('.results .price').first()).toBeVisible()

      const filtersAndSort = page.getByRole('button', {
        name: 'Filters and sort',
      })

      for (const control of [
        page.getByRole('button', { name: 'Clear search' }),
        page.getByRole('button', { name: /^Cart,/ }),
        page.getByRole('button', { name: 'Filter by TLD' }),
        filtersAndSort,
      ]) {
        const bounds = await control.boundingBox()
        expect(bounds?.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX)
        expect(bounds?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX)
      }

      await input.press('Enter')
      await expect(input).not.toBeFocused()
      await expect(input).toHaveValue('mobile-idea')
      await input.tap()
      await page.setViewportSize({ width, height: 320 })
      await expect(input).toBeFocused()
      await expect(input).toBeInViewport()
      await expect(input).toHaveValue('mobile-idea')
      await page.setViewportSize({ width, height })
      await filtersAndSort.tap()
      const filtersDialog = page.getByRole('dialog', {
        name: 'Filters and sort',
      })
      await expect(filtersDialog).toBeVisible()
      await expect(filtersDialog.locator('.filters-panel')).not.toHaveAttribute(
        'data-transition',
        '',
      )
      const choices = filtersDialog.locator('.filter-choice')
      for (const control of await choices.all()) {
        const bounds = await control.boundingBox()
        expect(bounds?.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX)
        expect(bounds?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX)
      }
      await expect(
        filtersDialog.getByRole('button', { name: 'Show All', exact: true }),
      ).toBeFocused()
      await expect(
        filtersDialog.getByRole('button', { name: 'Show All', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
      await expect(filtersDialog.getByRole('listbox')).toHaveCount(0)
      await filtersDialog
        .getByRole('button', { name: 'Price', exact: true })
        .tap()
      await expect(filtersDialog).toBeHidden()
      await expect(filtersAndSort).toBeFocused()
      await filtersAndSort.tap()
      await expect(
        filtersDialog.getByRole('button', { name: 'Price', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true')
      await filtersDialog
        .getByRole('button', { name: 'Available', exact: true })
        .tap()
      await expect(filtersDialog).toBeHidden()
      await expect(filtersAndSort).toBeFocused()
      await expect(page.locator('.domain-row').first()).toContainText('$1.99')
      await chooseFilterOption(page, 'Filter by TLD', '.app')
      await expect(page.locator('.result-count')).toHaveText(
        '1 domains · Registration prices in USD',
      )
      await expect(page.locator('#domain-results .domain-row')).toHaveCount(1)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width)

      await page.getByRole('button', { name: 'Clear search' }).tap()
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      await expect(input).toBeInViewport()
      await expect(page).toHaveURL('/')
      await page.getByRole('heading', { name: 'Begin your search' }).tap()
      await expect(input).not.toBeFocused()
      await expect(
        page.getByRole('heading', { name: 'Begin your search' }),
      ).toBeVisible()
      await expect(
        page.getByRole('heading', {
          name: 'Find a domain for the next viral idea.',
        }),
      ).not.toBeVisible()
      expect(
        await originalInput?.evaluate(
          element => element === document.getElementById('domain-search'),
        ),
      ).toBe(true)
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
}

test('mobile empty search matches the compact header and survives hydration without moving focus', async ({
  browser,
  browserName,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
    viewport: { width: 393, height: 852 },
    baseURL,
  })
  const page = await context.newPage()
  await mockDomainSearch(page)
  let releaseBundle = () => {}
  const bundleGate = new Promise<void>(resolve => {
    releaseBundle = resolve
  })
  await page.route('**/assets/*.js', async route => {
    await bundleGate
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'commit' })
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    const hero = page.getByRole('heading', {
      name: 'Find a domain for the next viral idea.',
    })
    const beginSearch = page.getByRole('heading', { name: 'Begin your search' })
    await expect(hero).toBeVisible()
    await expect(beginSearch).not.toBeVisible()
    await page.evaluate(() => document.fonts.load('600 40px "Geist Variable"'))
    const heroBounds = await hero.boundingBox()
    expect(heroBounds?.y).toBeCloseTo(273, 0)
    await expect(hero).toHaveCSS('font-size', '40px')
    await expect(page.locator('form.search')).toHaveCSS('height', '38px')
    const originalInput = await input.elementHandle()

    await input.tap()
    await expect(input).toBeFocused()
    await expect(hero).not.toBeVisible()
    await expect(beginSearch).toBeVisible()
    const headerBounds = await page.locator('.header').boundingBox()
    const inputBounds = await page.locator('form.search').boundingBox()
    expect(headerBounds?.height).toBeCloseTo(123, 0)
    expect(inputBounds?.y).toBeCloseTo(75, 0)
    expect(inputBounds?.height).toBeCloseTo(38, 0)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    const emptyBounds = await beginSearch.boundingBox()

    releaseBundle()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).toBeFocused()
    await expect(beginSearch).toBeVisible()
    expect(await beginSearch.boundingBox()).toEqual(emptyBounds)
    expect(
      await originalInput?.evaluate(
        element => element === document.getElementById('domain-search'),
      ),
    ).toBe(true)

    await input.fill('new-project')
    await expect(
      page.getByRole('heading', { name: 'Top Results' }),
    ).toBeVisible()
    await expect(beginSearch).not.toBeVisible()
    await input.fill('')
    await expect(input).toBeFocused()
    await expect(beginSearch).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Top Results' }),
    ).not.toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  } finally {
    releaseBundle()
    await context.close()
  }
})

for (const phase of ['before hydration', 'after hydration']) {
  test(`clearing search and dismissing the mobile keyboard retains the search header ${phase}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    if (baseURL === undefined) {
      throw new Error('The domain example requires a base URL')
    }

    const context = await browser.newContext({
      ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
      viewport: { width: 393, height: 852 },
      baseURL,
    })
    const page = await context.newPage()
    await mockDomainSearch(page)
    let releaseBundle = () => {}
    const bundleGate = new Promise<void>(resolve => {
      releaseBundle = resolve
    })
    if (phase === 'before hydration') {
      await page.route('**/assets/*.js', async route => {
        await bundleGate
        await route.continue()
      })
    }

    try {
      await page.goto('/', { waitUntil: 'commit' })
      if (phase === 'after hydration') {
        await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      }
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      const originalInput = await input.elementHandle()
      await input.fill('acme')
      await expect(page).toHaveURL(/q=acme/)
      await input.fill('')
      await expect(page).toHaveURL(/\/$/)
      await input.press('Enter')
      await expect(input).not.toBeFocused()

      const beginSearch = page.getByRole('heading', {
        name: 'Begin your search',
      })
      const hero = page.getByRole('heading', {
        name: 'Find a domain for the next viral idea.',
      })
      await expect(beginSearch).toBeVisible()
      await expect(hero).not.toBeVisible()
      expect((await page.locator('form.search').boundingBox())?.y).toBeCloseTo(
        75,
        0,
      )
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

      releaseBundle()
      await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      await expect(page.locator('#domains-app')).toHaveAttribute(
        'data-search-layout',
        'Search',
      )
      await expect(input).not.toBeFocused()
      await expect(beginSearch).toBeVisible()
      await expect(hero).not.toBeVisible()
      expect(
        await originalInput?.evaluate(
          element => element === document.getElementById('domain-search'),
        ),
      ).toBe(true)
      await input.fill('again')
      await expect(
        page.getByRole('heading', { name: 'Top Results' }),
      ).toBeVisible()
    } finally {
      releaseBundle()
      await context.close()
    }
  })
}

for (const phase of ['before hydration', 'after hydration']) {
  test(`tapping Domains focuses search during the mobile gesture ${phase}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    if (baseURL === undefined) {
      throw new Error('The domain example requires a base URL')
    }

    const context = await browser.newContext({
      ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
      baseURL,
    })
    const page = await context.newPage()
    await mockDomainSearch(page)
    let releaseBundle = () => {}
    const bundleGate = new Promise<void>(resolve => {
      releaseBundle = resolve
    })
    await page.route('**/assets/*.js', async route => {
      await bundleGate
      await route.continue()
    })

    try {
      await page.goto('/?q=acme', { waitUntil: 'commit' })
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      await expect(input).toHaveValue('acme')
      await expect(input).not.toBeFocused()
      const originalInput = await input.elementHandle()

      if (phase === 'after hydration') {
        releaseBundle()
        await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      }

      await page.evaluate(() => {
        document.addEventListener('click', event => {
          if (
            event.target instanceof Element &&
            event.target.closest('a.brand') !== null
          ) {
            document.documentElement.setAttribute(
              'data-focus-on-domains-click',
              document.activeElement?.id ?? '',
            )
          }
        })
      })
      await page.getByRole('link', { name: 'Domains home' }).tap()
      await expect(page.locator('html')).toHaveAttribute(
        'data-focus-on-domains-click',
        'domain-search',
      )
      await expect(input).toBeFocused()
      await expect(input).toBeInViewport()
      await expect(input).toHaveValue('')
      await expect(page).toHaveURL('/')
      await input.fill('ready-to-type')
      releaseBundle()
      await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      await expect(input).toBeFocused()
      await expect(input).toHaveValue('ready-to-type')
      await expect(page).toHaveURL(/q=ready-to-type/)
      await expect(page.locator('.domain-card').first()).toContainText(
        'ready-to-type.com',
      )
      expect(
        await originalInput?.evaluate(
          element => element === document.getElementById('domain-search'),
        ),
      ).toBe(true)
    } finally {
      releaseBundle()
      await context.close()
    }
  })
}

test('mobile submission dismisses focus before hydration and preserves the query at handoff', async ({
  browser,
  browserName,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
    baseURL,
  })
  const page = await context.newPage()
  await mockDomainSearch(page)
  let releaseBundle = () => {}
  const bundleGate = new Promise<void>(resolve => {
    releaseBundle = resolve
  })
  await page.route('**/assets/*.js', async route => {
    await bundleGate
    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'commit' })
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    await expect(input).toBeVisible()
    const originalInput = await input.elementHandle()
    await input.tap()
    await input.fill('early-mobile')
    await input.press('Enter')
    await expect(input).not.toBeFocused()
    await expect(input).toHaveValue('early-mobile')
    await expect(page).toHaveURL(/q=early-mobile/)
    releaseBundle()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).not.toBeFocused()
    await expect(input).toHaveValue('early-mobile')
    await expect(page.locator('.domain-card').first()).toContainText(
      'early-mobile.com',
    )
    expect(
      await originalInput?.evaluate(
        element => element === document.getElementById('domain-search'),
      ),
    ).toBe(true)
  } finally {
    releaseBundle()
    await context.close()
  }
})

for (const { name, width, height } of PHONE_VIEWPORTS.filter(
  viewport => viewport.width >= 390,
)) {
  test(`mobile cart traps focus, locks page scrolling, and restores focus in ${name}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    if (baseURL === undefined) {
      throw new Error('The domain example requires a base URL')
    }

    const context = await browser.newContext({
      ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
      viewport: { width, height },
      baseURL,
    })
    const page = await context.newPage()
    await mockDomainSearch(page)

    try {
      await page.goto('/?q=acme')
      await page
        .locator('.domain-card')
        .getByRole('button', { name: 'Add acme.com to cart', exact: true })
        .tap()
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      const trigger = page.getByRole('button', { name: 'Cart, 1 domains' })
      await page.evaluate(() => window.scrollTo(0, 100))
      await trigger.tap()
      const dialog = page.getByRole('dialog', { name: 'Your cart' })
      const close = page.getByRole('button', { name: 'Close cart panel' })
      await expect(dialog).toBeVisible()
      await expect(close).toBeFocused()
      await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
      await page.keyboard.press('Shift+Tab')
      expect(
        await dialog.evaluate(element =>
          element.contains(document.activeElement),
        ),
      ).toBe(true)
      const scrollOffset = await page.evaluate(() => scrollY)
      if (browserName === 'webkit') {
        await page.keyboard.press('PageDown')
      } else {
        await page.mouse.move(width / 2, height / 2)
        await page.mouse.wheel(0, 200)
      }
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollOffset)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect(input).toHaveValue('acme')
      await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollOffset)

      await trigger.tap()
      await expect(close).toBeFocused()
      await close.tap()
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await trigger.tap()
      await page.setViewportSize({ width: 844, height: 320 })
      await page
        .locator('.dialog-backdrop')
        .click({ position: { x: 20, y: 100 } })
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
    } finally {
      await context.close()
    }
  })
}

test('mobile results use page scrolling beneath the pinned navigation', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?q=acme')
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  const results = page.getByRole('list', { name: 'All domain results' })
  await expect(results).toHaveCSS('overflow-y', 'visible')
  await expect
    .poll(() => results.evaluate(element => element.clientHeight))
    .toBeGreaterThan(844)
  await page.mouse.move(195, 500)
  for (const distancePx of [500, 400]) {
    const previousScrollTopPx = await page.evaluate(() => window.scrollY)

    // NOTE: Linux WebKit drops wheel scrolling with overscroll-behavior: none on the root.
    if (browserName === 'webkit' && process.platform === 'linux') {
      await page.keyboard.press('PageDown')
    } else {
      await page.mouse.wheel(0, distancePx)
    }

    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(previousScrollTopPx)
  }
  await expect
    .poll(() => results.evaluate(element => element.scrollTop))
    .toBe(0)
  await expect
    .poll(() =>
      page
        .locator('.header')
        .evaluate(element => element.getBoundingClientRect().top),
    )
    .toBe(0)
  await expect(
    page.getByRole('searchbox', { name: 'Search domains' }),
  ).toBeInViewport()
})

test('mobile results use a dark two-row header and single-column layout', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?q=foldkit')
  await expect(page.locator('.domain-card').first()).toContainText(
    'Not available',
  )
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')

  const geometry = await page.evaluate(() => {
    const bounds = (element: Element | null) => {
      if (element === null) {
        throw new Error('Expected responsive layout element')
      }

      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      }
    }
    const itemBounds = (selector: string) =>
      [...document.querySelectorAll(selector)]
        .slice(0, 4)
        .map(element => bounds(element))

    return {
      viewportWidth: innerWidth,
      header: bounds(document.querySelector('.header')),
      brand: bounds(document.querySelector('.brand')),
      search: bounds(document.querySelector('form.search')),
      topResults: bounds(document.querySelector('.top-results')),
      cards: itemBounds('.top-results .domain-card'),
      rowGroup: bounds(document.querySelector('.domain-row-group')),
      rows: itemBounds('.domain-row-group .domain-row'),
      scrollWidth: document.documentElement.scrollWidth,
    }
  })

  expect(geometry.header.y).toBe(0)
  expect(geometry.header.height).toBeCloseTo(123, 0)
  expect(geometry.search.x).toBeCloseTo(16, 0)
  expect(geometry.search.y).toBeCloseTo(75, 0)
  expect(geometry.search.width).toBeCloseTo(geometry.viewportWidth - 32, 0)
  expect(geometry.search.height).toBeCloseTo(38, 0)
  expect(geometry.search.y).toBeGreaterThan(geometry.brand.bottom)
  expect(geometry.search.bottom).toBeLessThanOrEqual(geometry.header.bottom)
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth)

  const expectSingleColumn = (
    items: ReadonlyArray<{
      x: number
      y: number
      width: number
      bottom: number
    }>,
    container: { x: number; width: number },
  ) => {
    expect(items).toHaveLength(4)

    items.reduce<number | undefined>((previousBottom, item) => {
      expect(item.x).toBeCloseTo(container.x, 0)
      expect(item.width).toBeCloseTo(container.width, 0)

      if (previousBottom !== undefined) {
        expect(item.y).toBeGreaterThanOrEqual(previousBottom)
      }

      return item.bottom
    }, undefined)
  }

  expectSingleColumn(geometry.cards, geometry.topResults)
  expectSingleColumn(geometry.rows, geometry.rowGroup)
  const [unavailableCard, , availableCard] = geometry.cards
  const [unavailableRow, , availableRow] = geometry.rows

  if (
    unavailableCard === undefined ||
    availableCard === undefined ||
    unavailableRow === undefined ||
    availableRow === undefined
  ) {
    throw new Error('Expected available and unavailable mobile results')
  }

  expect(unavailableCard.height).toBeCloseTo(availableCard.height, 0)
  expect(unavailableRow.height).toBeCloseTo(availableRow.height, 0)
  await page.screenshot({ path: testInfo.outputPath('mobile-results.png') })
  await page
    .getByRole('button', { name: 'Filters and sort', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Filters and sort' }),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('mobile-filters.png') })
})

for (const phase of ['before hydration', 'after hydration']) {
  test(`first mobile typing keeps Top Results in view ${phase}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    if (baseURL === undefined) {
      throw new Error('The domain example requires a base URL')
    }

    const context = await browser.newContext({
      ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
      viewport: { width: 390, height: 664 },
      baseURL,
    })
    const page = await context.newPage()
    let releaseBundle = () => {}
    const bundleGate = new Promise<void>(resolve => {
      releaseBundle = resolve
    })
    let releaseDomains = () => {}
    const quoteGate = new Promise<void>(resolve => {
      releaseDomains = resolve
    })
    await mockDomainSearch(page, label =>
      Effect.promise(() => quoteGate).pipe(
        Effect.as(makeDomainFixtures(label)),
      ),
    )
    await page.addInitScript(() => {
      window.addEventListener('scroll', () => {
        const maximum = Math.max(
          Number(document.documentElement.getAttribute('data-max-page-scroll')),
          window.scrollY,
        )
        document.documentElement.setAttribute(
          'data-max-page-scroll',
          globalThis.String(maximum),
        )
      })
    })
    if (phase === 'before hydration') {
      await page.route('**/assets/*.js', async route => {
        await bundleGate
        await route.continue()
      })
    }

    try {
      await page.goto('/', { waitUntil: 'commit' })
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      const heading = page.getByRole('heading', {
        name: 'Top Results',
        exact: true,
      })
      if (phase === 'after hydration') {
        await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      }
      await input.tap()
      for (const query of ['d', 'de']) {
        await input.fill(query)
        await expect(page.locator('.domain-card').first()).toContainText(
          `${query}.com`,
        )
        await expect(heading).toBeInViewport()
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      }
      await expect(page.locator('.results .price')).toHaveCount(0)
      releaseBundle()
      await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      await expect(
        page.locator('#domain-results [data-virtual-list-item-index]').first(),
      ).toBeAttached()
      await expect(heading).toBeInViewport()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      releaseDomains()
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await expect(heading).toBeInViewport()
      await input.pressSequentially('v')
      await expect(page.locator('.domain-card').first()).toContainText(
        'dev.com',
      )
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await expect(heading).toBeInViewport()

      await page.getByRole('button', { name: 'Clear search, Esc' }).tap()
      await expect(input).toHaveValue('')
      await expect(page.locator('#domain-results')).toHaveCount(0)
      await input.fill('fresh')
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await expect(heading).toBeInViewport()
      await expect(input).toBeFocused()
      expect(
        await page.evaluate(() =>
          Number(document.documentElement.getAttribute('data-max-page-scroll')),
        ),
      ).toBe(0)
    } finally {
      releaseBundle()
      releaseDomains()
      await context.close()
    }
  })
}

test('mobile filter sheet slides from the bottom, preserves selected choices, and slides out on Escape', async ({
  browser,
  baseURL,
}, testInfo) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: testInfo.outputPath('motion-video'),
      size: { width: 390, height: 844 },
    },
  })
  const page = await context.newPage()
  await mockDomainSearch(page)

  try {
    await page.goto('/?q=acme')
    await expect(page.locator('.domain-card .price').first()).toBeVisible()
    const trigger = page.getByRole('button', {
      name: 'Filters and sort',
      exact: true,
    })
    const dialog = page.getByRole('dialog', { name: 'Filters and sort' })
    const panel = dialog.locator('.filters-panel')
    const frames = page.evaluate(
      () =>
        new Promise<
          ReadonlyArray<{
            top: number
            height: number
            viewportHeight: number
            isLeaving: boolean
          }>
        >(resolve => {
          const samples: Array<{
            top: number
            height: number
            viewportHeight: number
            isLeaving: boolean
          }> = []
          let hasAppeared = false
          const sample = () => {
            const element = document.querySelector('.filters-panel')
            if (element !== null) {
              hasAppeared = true
              const bounds = element.getBoundingClientRect()
              samples.push({
                top: bounds.top,
                height: bounds.height,
                viewportHeight: innerHeight,
                isLeaving: element.hasAttribute('data-leave'),
              })
            } else if (hasAppeared) {
              resolve(samples)
              return
            }

            requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        }),
    )
    await trigger.click()
    await expect(panel).toHaveCSS('transition-duration', '0.5s')
    await expect(panel).not.toHaveAttribute('data-transition', '')
    const selectedAvailability = dialog.getByRole('button', {
      name: 'Show All',
      exact: true,
    })
    const selectedSort = dialog.getByRole('button', {
      name: 'Relevance',
      exact: true,
    })
    await expect(selectedAvailability).toBeFocused()
    await expect(selectedAvailability).toHaveAttribute('aria-pressed', 'true')
    await expect(selectedSort).toHaveAttribute('aria-pressed', 'true')
    await expect(
      selectedAvailability.locator('.filter-choice-check'),
    ).toBeVisible()
    await expect(selectedSort.locator('.filter-choice-check')).toBeVisible()
    await expect(
      dialog
        .getByRole('button', { name: 'Available', exact: true })
        .locator('.filter-choice-check'),
    ).toBeHidden()
    await expect(dialog.getByRole('listbox')).toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath('mobile-filter-sheet.png'),
    })
    await page.keyboard.press('Escape')
    await expect(panel).toHaveAttribute('data-leave', '')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    const samples = await frames
    for (const isLeaving of [false, true]) {
      expect(
        samples.some(
          sample =>
            sample.isLeaving === isLeaving &&
            sample.top > sample.viewportHeight - sample.height + 4 &&
            sample.top < sample.viewportHeight - 4,
        ),
      ).toBe(true)
    }
  } finally {
    await context.close()
    const video = page.video()
    if (video !== null) {
      await testInfo.attach('mobile-filter-sheet-motion', {
        path: await video.path(),
        contentType: 'video/webm',
      })
    }
  }
})

test('mobile filter sheet respects reduced motion and focuses the selected availability on reopen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?q=acme')
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  const trigger = page.getByRole('button', {
    name: 'Filters and sort',
    exact: true,
  })
  const dialog = page.getByRole('dialog', { name: 'Filters and sort' })
  await trigger.click()
  await expect(dialog.locator('.filters-panel')).toHaveCSS(
    'transition-duration',
    '0s',
  )
  await expect(dialog.locator('.filters-backdrop')).toHaveCSS(
    'transition-duration',
    '0s',
  )
  await dialog.getByRole('button', { name: 'Available', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  const selected = dialog.getByRole('button', {
    name: 'Available',
    exact: true,
  })
  await expect(selected).toBeFocused()
  await expect(selected).toHaveAttribute('aria-pressed', 'true')
  await expect(selected.locator('.filter-choice-check')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

for (const phase of ['before hydration', 'after hydration']) {
  for (const action of ['backspace', 'clear button', 'Escape']) {
    test(`emptying a scrolled mobile search with ${action} returns to the top ${phase}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 664 })
      let releaseBundle = () => {}
      const bundleGate = new Promise<void>(resolve => {
        releaseBundle = resolve
      })

      if (phase === 'before hydration') {
        await page.route('**/assets/*.js', async route => {
          await bundleGate
          await route.continue()
        })
      }

      try {
        await page.goto('/?q=acme', { waitUntil: 'commit' })
        const input = page.getByRole('searchbox', { name: 'Search domains' })
        await expect(input).toHaveValue('acme')

        if (phase === 'after hydration') {
          await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
          await expect(
            page.locator('.domain-card .price').first(),
          ).toBeVisible()
        }

        await input.focus()
        const scrollOffsetPx = phase === 'before hydration' ? 150 : 600
        await page.evaluate(top => {
          window.scrollTo({ top, behavior: 'instant' })
        }, scrollOffsetPx)
        await expect
          .poll(() => page.evaluate(() => window.scrollY))
          .toBe(scrollOffsetPx)

        if (action === 'backspace') {
          await input.press('End')
          for (let remaining = 3; remaining >= 0; remaining--) {
            await input.press('Backspace')
            await expect(input).toHaveValue('acme'.slice(0, remaining))
          }
        } else if (action === 'clear button') {
          await page
            .getByRole('button', { name: 'Clear search', exact: false })
            .click()
        } else {
          await input.press('Escape')
        }

        await expect(input).toHaveValue('')
        await expect(input).toBeFocused()
        await expect(page).toHaveURL('/')
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
        await expect(input).toBeInViewport()

        releaseBundle()
        await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
        await expect(input).toHaveValue('')
        await expect(input).toBeFocused()
      } finally {
        releaseBundle()
      }
    })
  }
}

test('mobile TLD sheet searches the complete catalog, contains scrolling, and preserves selection on dismissal', async ({
  browser,
  baseURL,
}, testInfo) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: testInfo.outputPath('tld-video'),
      size: { width: 390, height: 844 },
    },
  })
  const page = await context.newPage()
  await mockDomainSearch(page)

  try {
    await page.goto('/?q=acme')
    await expect(page.locator('.domain-card .price').first()).toBeVisible()
    const trigger = page.getByRole('button', {
      name: 'Filter by TLD',
      exact: false,
    })
    const dialog = page.getByRole('dialog', {
      name: 'Filter by TLD',
      exact: true,
    })
    const search = dialog.getByRole('searchbox', { name: 'Search TLDs' })
    const tldChoices = dialog.getByRole('button').filter({ hasText: /^\./ })
    await trigger.click()
    await expect
      .poll(
        () =>
          dialog.locator('.tld-panel').evaluate(element => {
            const bounds = element.getBoundingClientRect()
            return (
              element.hasAttribute('data-enter') &&
              bounds.top > innerHeight - bounds.height + 4 &&
              bounds.top < innerHeight - 4
            )
          }),
        { intervals: [16, 32, 64] },
      )
      .toBe(true)
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('')
    await expect(dialog.getByRole('combobox')).toHaveCount(0)
    await expect(
      dialog.getByRole('button', { name: 'All TLDs', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(tldChoices).toHaveCount(supportedTlds.length)
    const labels = await tldChoices.allTextContents()
    expect(labels).toEqual(
      Array.sort(
        Array.map(supportedTlds, tld => `.${tld}`),
        String.Order,
      ),
    )
    await expect(dialog.locator('.tld-panel')).not.toHaveAttribute(
      'data-transition',
      '',
    )
    await page.mouse.move(20, 20)
    await page.screenshot({ path: testInfo.outputPath('mobile-tld-sheet.png') })
    const pageOffsetPx = await page.evaluate(() => window.scrollY)
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
    await tldChoices.last().scrollIntoViewIfNeeded()
    await expect(tldChoices.last()).toBeInViewport()
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(pageOffsetPx)
    await search.fill('  .ACADEMY  ')
    await expect(tldChoices).toHaveCount(1)
    await expect(tldChoices).toHaveText('.academy')
    await tldChoices.click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('.academy')
    await expect(page.locator('#domain-results .domain-row')).toHaveCount(1)
    await expect(page.locator('#domain-results .domain-row')).toContainText(
      'acme.academy',
    )

    await trigger.click()
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('')
    await expect(
      dialog.getByRole('button', { name: '.academy', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await search.fill('no-such-tld')
    await expect(
      dialog.getByText('No TLDs found.', { exact: true }),
    ).toBeVisible()
    await expect(tldChoices).toHaveCount(0)
    await search.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('.academy')
    await expect(
      page.getByRole('searchbox', { name: 'Search domains' }),
    ).toHaveValue('acme')
    await expect(page.locator('#domain-results .domain-row')).toContainText(
      'acme.academy',
    )
    await trigger.click()
    await expect(search).toHaveValue('')
    await expect(tldChoices).toHaveCount(supportedTlds.length)
    await search.fill('zone')
    await dialog.getByRole('button', { name: '.zone', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(page.locator('#domain-results .domain-row')).toHaveCount(1)
    await expect(page.locator('#domain-results .domain-row')).toContainText(
      'acme.zone',
    )
    await expect(
      page.locator('#domain-results .domain-row .price'),
    ).toBeVisible()
    await trigger.click()
    await expect(search).toHaveValue('')
    await expect(
      dialog.getByRole('button', { name: '.zone', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await dialog.getByRole('button', { name: 'All TLDs', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('All TLDs')
    await expect(page.locator('#domain-results .domain-row')).not.toHaveCount(1)
  } finally {
    await context.close()
    const video = page.video()
    if (video !== null) {
      await testInfo.attach('mobile-tld-sheet', {
        path: await video.path(),
        contentType: 'video/webm',
      })
    }
  }
})

test('a mobile search restarts at the page top after backspacing a scrolled query to empty', async ({
  browser,
  browserName,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    ...devices[browserName === 'webkit' ? 'iPhone 13' : 'Pixel 5'],
    viewport: { width: 390, height: 852 },
    baseURL,
  })
  const page = await context.newPage()
  await mockDomainSearch(page)
  try {
    await page.goto('/?q=acme')
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    const originalInput = await input.elementHandle()
    await expect(page.locator('.domain-card .price').first()).toBeVisible()
    for (const nextQuery of ['acme', 'jo']) {
      await input.focus()
      await page.setViewportSize({ width: 390, height: 400 })
      await page.evaluate(() =>
        window.scrollTo({ top: 1300, behavior: 'instant' }),
      )
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(1000)
      await input.press('End')
      const previousQuery = await input.inputValue()
      for (const _character of previousQuery) {
        await input.press('Backspace')
      }
      await expect(input).toHaveValue('')
      await expect(page).toHaveURL('/')
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await input.pressSequentially(nextQuery, { delay: 30 })
      await expect(page.locator('.domain-card').first()).toContainText(
        `${nextQuery}.com`,
      )
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await expect(
        page.getByRole('heading', { name: 'Top Results', exact: true }),
      ).toBeInViewport()
      expect(
        await input.evaluate(
          (node, original) => node === original,
          originalInput,
        ),
      ).toBe(true)
      await expect(input).toBeFocused()
      await page.setViewportSize({ width: 390, height: 852 })
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    }
  } finally {
    await context.close()
  }
})
