import { Array, Effect } from 'effect'
import { writeFile } from 'node:fs/promises'

import AxeBuilder from '@axe-core/playwright'
import { type Page, type TestInfo, expect, test } from '@playwright/test'

import { makeDomainFixtures } from '../src/shared/domain.fixture'
import { SearchError } from '../src/shared/domainsRpc'
import { mockDomainSearch } from './api'

const MINIMUM_TEXT_CONTRAST = 4.5
const SRGB = {
  maximum: 255,
  linearThreshold: 0.04045,
  linearDivisor: 12.92,
  offset: 0.055,
  scale: 1.055,
  exponent: 2.4,
  redWeight: 0.2126,
  greenWeight: 0.7152,
  blueWeight: 0.0722,
  contrastOffset: 0.05,
}

const relativeLuminance = (color: string) => {
  const channels = color.match(/[\d.]+/g)
  if (channels === null) {
    throw new Error(`Expected computed RGB color, received ${color}`)
  }

  const [red, green, blue, alpha = 1] = Array.map(channels, globalThis.Number)
  if (
    red === undefined ||
    green === undefined ||
    blue === undefined ||
    alpha !== 1
  ) {
    throw new Error(`Expected an opaque RGB color, received ${color}`)
  }

  const linearize = (channel: number) => {
    const normalized = channel / SRGB.maximum
    return normalized <= SRGB.linearThreshold
      ? normalized / SRGB.linearDivisor
      : ((normalized + SRGB.offset) / SRGB.scale) ** SRGB.exponent
  }
  return (
    SRGB.redWeight * linearize(red) +
    SRGB.greenWeight * linearize(green) +
    SRGB.blueWeight * linearize(blue)
  )
}

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + SRGB.contrastOffset) /
    (Math.min(foregroundLuminance, backgroundLuminance) + SRGB.contrastOffset)
  )
}

const tabKeys = (browserName: string) => {
  const modifier =
    browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+' : ''
  return { next: `${modifier}Tab`, previous: `${modifier}Shift+Tab` }
}

for (const javaScriptEnabled of [false, true]) {
  test(`landing Tab order follows pricing, search, and source ${javaScriptEnabled ? 'after hydration' : 'in static HTML'}`, async ({
    browser,
    browserName,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled,
      viewport: { width: 1280, height: 900 },
    })

    try {
      const page = await context.newPage()
      await mockDomainSearch(page)
      await page.goto('/')
      await expect(page.locator('[data-foldkit-app]')).toHaveCount(
        javaScriptEnabled ? 0 : 1,
      )

      const pricing = page.getByRole('link', { name: 'Vercel pricing' })
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      const source = page.getByRole('link', { name: 'View source' })
      const keys = tabKeys(browserName)

      await pricing.focus()
      await page.keyboard.press(keys.next)
      await expect(input).toBeFocused()
      await page.keyboard.press(keys.next)
      await expect(source).toBeFocused()
      await page.keyboard.press(keys.previous)
      await expect(input).toBeFocused()
      await page.keyboard.press(keys.previous)
      await expect(pricing).toBeFocused()
    } finally {
      await context.close()
    }
  })
}

const checkAccessibility = async (
  page: Page,
  testInfo: TestInfo,
  state: string,
) => {
  const scan = await new AxeBuilder({ page }).analyze()
  const reportPath = testInfo.outputPath(`${state}-accessibility.json`)
  await writeFile(reportPath, JSON.stringify(scan, null, 2))
  await testInfo.attach(`${state}-accessibility`, {
    path: reportPath,
    contentType: 'application/json',
  })
  expect
    .soft(
      scan.violations.map(violation => ({
        rule: violation.id,
        impact: violation.impact,
        description: violation.help,
        elements: violation.nodes.slice(0, 5).map(node => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
      `${state} accessibility violations`,
    )
    .toEqual([])
}

for (const width of [1440, 390, 320]) {
  test(`landing, results, filters, and cart pass accessibility scans at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await mockDomainSearch(page)
    await page.goto('/')
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await checkAccessibility(page, testInfo, 'landing')
    await page.getByRole('searchbox', { name: 'Search domains' }).focus()
    await checkAccessibility(page, testInfo, 'focused-empty-search')

    await page
      .getByRole('searchbox', { name: 'Search domains' })
      .fill('foldkit')
    await expect(page.locator('.domain-card').first()).toContainText(
      'Not available',
    )
    await checkAccessibility(page, testInfo, 'results')

    const tldTrigger = page.getByRole('button', {
      name: 'Filter by TLD',
      exact: false,
    })
    const tldPopupRole = await tldTrigger.getAttribute('aria-haspopup')
    await tldTrigger.click()
    if (tldPopupRole === 'dialog') {
      const tldDialog = page.getByRole('dialog', {
        name: 'Filter by TLD',
        exact: true,
      })
      await expect(
        tldDialog.getByRole('searchbox', { name: 'Search TLDs' }),
      ).toBeFocused()
      await expect(tldDialog.locator('.tld-panel')).not.toHaveAttribute(
        'data-transition',
        '',
      )
      await checkAccessibility(page, testInfo, 'tld-sheet')
      await tldDialog.getByRole('button', { name: '.com', exact: true }).click()
      await expect(tldDialog).toBeHidden()
    } else {
      await checkAccessibility(page, testInfo, 'tld-listbox')
      await page.getByRole('option', { name: '.com', exact: true }).click()
    }
    if (width < 701) {
      await page
        .getByRole('button', { name: 'Filters and sort', exact: true })
        .click()
      const dialog = page.getByRole('dialog', { name: 'Filters and sort' })
      await expect(
        dialog.getByRole('button', { name: 'Show All', exact: true }),
      ).toBeFocused()
      await expect(dialog.locator('.filters-panel')).not.toHaveAttribute(
        'data-transition',
        '',
      )
      await checkAccessibility(page, testInfo, 'filters-sheet')
      await dialog
        .getByRole('button', { name: 'Available', exact: true })
        .click()
      await expect(dialog).toBeHidden()
      await expect(
        page.getByRole('button', { name: 'Filters and sort', exact: true }),
      ).toBeFocused()
    } else {
      await page
        .getByRole('button', { name: 'Filter availability', exact: false })
        .click()
      await checkAccessibility(page, testInfo, 'availability-listbox')
      await page.getByRole('option', { name: 'Available', exact: true }).click()
    }
    await expect(page.getByRole('status')).toContainText([
      'No domains match',
      '0 domains',
    ])
    await checkAccessibility(page, testInfo, 'empty-filter')

    await page.getByRole('button', { name: 'Cart, 0 domains' }).click()
    await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible()
    await checkAccessibility(page, testInfo, 'empty-cart')
    await page.getByRole('button', { name: 'Close cart panel' }).click()
    await page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add foldkit.app to cart', exact: true })
      .click()
    await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
    await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible()
    await checkAccessibility(page, testInfo, 'filled-cart')
    await page.getByRole('button', { name: 'Close cart panel' }).click()

    await page.goto('/missing')
    await expect(
      page.getByRole('heading', { name: '404 — Page Not Found' }),
    ).toBeVisible()
    await checkAccessibility(page, testInfo, 'not-found')
  })

  test(`pending quotes and search failure pass accessibility scans at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    let releaseDomains = () => {}
    const domainsGate = new Promise<void>(resolve => {
      releaseDomains = resolve
    })
    await mockDomainSearch(page, label =>
      Effect.promise(() => domainsGate).pipe(
        Effect.as(makeDomainFixtures(label)),
      ),
    )

    try {
      await page.goto('/?q=acme')
      await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
      await expect(
        page.getByRole('status', { name: 'Searching domains' }),
      ).toBeVisible()
      await checkAccessibility(page, testInfo, 'pending')
      releaseDomains()
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await mockDomainSearch(page, () => Effect.fail(SearchError.Unavailable()))
      await page
        .getByRole('searchbox', { name: 'Search domains' })
        .fill('failed-search')
      await expect(page.getByRole('alert')).toBeVisible()
      await checkAccessibility(page, testInfo, 'search-failure')
    } finally {
      releaseDomains()
    }
  })
}

test('keyboard cart removal and retry preserve a useful focus target', async ({
  page,
  browserName,
}) => {
  await mockDomainSearch(page)
  await page.goto('/?q=acme')
  const cartAnnouncement = await page
    .locator('#cart-announcement')
    .elementHandle()
  await page
    .locator('.domain-card')
    .getByRole('button', { name: 'Add acme.com to cart', exact: true })
    .click()
  await expect(page.locator('#cart-announcement')).toHaveText(
    '1 domain in your cart.',
  )
  expect(
    await cartAnnouncement?.evaluate(
      element => element === document.getElementById('cart-announcement'),
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
  const dialog = page.getByRole('dialog', { name: 'Your cart' })
  const close = page.getByRole('button', { name: 'Close cart panel' })
  await expect(close).toBeFocused()
  await page.keyboard.press(tabKeys(browserName).next)
  await expect(
    dialog.getByRole('button', { name: 'Remove acme.com', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).toContainText('Your next idea starts with a name.')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Cart, 0 domains' }),
  ).toBeFocused()

  await mockDomainSearch(page, () => Effect.fail(SearchError.Unavailable()))
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('retry-keyboard')
  const retry = page.getByRole('button', { name: 'Try again' })
  await expect(retry).toBeVisible()
  await mockDomainSearch(page)
  await retry.focus()
  await page.keyboard.press('Enter')
  await expect(input).toBeFocused()
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
})

test('filter listboxes support keyboard navigation, typeahead, selection, and dismissal', async ({
  page,
  browserName,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockDomainSearch(page)
  await page.goto('/?q=acme')
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  const trigger = page.getByRole('button', {
    name: 'Filter by TLD',
    exact: false,
  })
  const listbox = page.getByRole('listbox', {
    name: 'Filter by TLD',
    exact: false,
  })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(listbox).toBeVisible()
  await expect(listbox).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({ path: testInfo.outputPath('tld-listbox.png') })
  await expect(
    listbox.getByRole('option', { name: 'All TLDs', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowDown')
  const comOption = listbox.getByRole('option', { name: '.com', exact: true })
  await expect(comOption).toHaveAttribute('data-active', '')
  await page.keyboard.press('Enter')
  await expect(listbox).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('.com')
  await expect(page.locator('#domain-results .domain-row')).toHaveCount(1)
  await expect(page.locator('#domain-results .domain-row')).toContainText(
    'acme.com',
  )

  await page.keyboard.press('ArrowDown')
  await expect(listbox).toBeFocused()
  await page.keyboard.press('a')
  await expect(
    listbox.getByRole('option', { name: '.app', exact: true }),
  ).toHaveAttribute('data-active', '')
  await page.keyboard.press('i')
  const aiOption = listbox.getByRole('option', { name: '.ai', exact: true })
  await expect(aiOption).toHaveAttribute('data-active', '')
  await page.keyboard.press('Enter')
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('.ai')
  await expect(page.locator('#domain-results .domain-row')).toHaveCount(1)
  await expect(page.locator('#domain-results .domain-row')).toContainText(
    'acme.ai',
  )

  await page.keyboard.press('Enter')
  await expect(listbox).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(
    listbox.getByRole('option', { name: '.io', exact: true }),
  ).toHaveAttribute('data-active', '')
  await page.keyboard.press('Escape')
  await expect(listbox).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText('.ai')
  await page.keyboard.press('Enter')
  await expect(listbox).toBeFocused()
  await page.keyboard.press(tabKeys(browserName).next)
  await expect(listbox).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Filter availability', exact: false }),
  ).toBeFocused()
  await expect(trigger).toContainText('.ai')
  await trigger.click()
  await expect(listbox).toBeVisible()
  await page.locator('.filter-backdrop').click({ position: { x: 8, y: 8 } })
  await expect(listbox).toBeHidden()
  await expect(trigger).toContainText('.ai')
})

test('keyboard users can skip navigation, scroll the complete catalog, and leave the results', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mockDomainSearch(page)
  await page.goto('/?q=acme')
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  await input.focus()
  for (const target of [
    page.getByRole('button', { name: 'Cart, 0 domains' }),
    page.getByRole('link', { name: 'Domains home' }),
    page.getByRole('link', { name: 'Skip to main content' }),
  ]) {
    await page.keyboard.press(tabKeys(browserName).previous)
    await expect(target).toBeFocused()
  }
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  for (const target of [
    input,
    page.getByRole('button', { name: 'Clear search, Esc', exact: true }),
    page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add acme.com to cart', exact: true }),
    page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add acme.dev to cart', exact: true }),
    page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add acme.app to cart', exact: true }),
    page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add acme.io to cart', exact: true }),
    page.getByRole('button', { name: 'Filter by TLD', exact: false }),
    page.getByRole('button', { name: 'Filter availability', exact: false }),
    page.getByRole('button', { name: 'Sort results', exact: false }),
    page.getByRole('list', { name: 'All domain results' }),
  ]) {
    await page.keyboard.press(tabKeys(browserName).next)
    await expect(target).toBeFocused()
  }
  const results = page.getByRole('list', { name: 'All domain results' })
  for (const key of ['ArrowDown', 'PageDown']) {
    const previousOffsetPx = await page.evaluate(() => window.scrollY)
    await page.keyboard.press(key)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(previousOffsetPx)
  }
  await expect(results).toBeFocused()
  await page.keyboard.press('End')
  await expect(
    results.getByRole('button', { name: 'Add acme.zone to cart', exact: true }),
  ).toBeVisible()
  await expect(results).toBeFocused()
  for (const key of ['PageUp', 'ArrowUp']) {
    const previousOffsetPx = await page.evaluate(() => window.scrollY)
    await page.keyboard.press(key)
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(previousOffsetPx)
  }
  await page.keyboard.press('Home')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(
    results.getByRole('button', { name: 'Add acme.com to cart', exact: true }),
  ).toBeVisible()
  await page.keyboard.press(tabKeys(browserName).previous)
  await expect(
    page.getByRole('button', { name: 'Sort results', exact: false }),
  ).toBeFocused()
})

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 664 },
]) {
  test(`Tab focus keeps the first virtual row below the navigation at ${viewport.width}px`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(viewport)
    await mockDomainSearch(page)
    await page.goto('/?q=acme')
    await expect(page.locator('.domain-card .price').first()).toBeVisible()
    const results = page.getByRole('list', { name: 'All domain results' })
    const firstRow = results.locator('.domain-row').first()
    const precedingControl =
      viewport.width < 701
        ? page.getByRole('button', { name: 'Filters and sort', exact: true })
        : page.getByRole('button', { name: 'Sort results', exact: false })
    const headerBottom = await page
      .locator('.header')
      .evaluate(element => element.getBoundingClientRect().bottom)

    await precedingControl.focus()
    for (const entry of ['initial', 'repeated']) {
      await page.keyboard.press(tabKeys(browserName).next)
      await expect(results, entry).toBeFocused()
      await expect(firstRow, entry).toContainText('acme.com')
      await expect
        .poll(
          () =>
            firstRow.evaluate(element => element.getBoundingClientRect().top),
          { message: entry },
        )
        .toBeGreaterThanOrEqual(headerBottom)
      await expect(firstRow, entry).toBeInViewport({ ratio: 1 })
      await page.keyboard.press(tabKeys(browserName).previous)
      await expect(precedingControl, entry).toBeFocused()
    }
  })
}

test('loading announcements retain their node outside the busy region and respect reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let releaseDomains = () => {}
  const domainsGate = new Promise<void>(resolve => {
    releaseDomains = resolve
  })
  await mockDomainSearch(page, label =>
    Effect.promise(() => domainsGate).pipe(
      Effect.as(makeDomainFixtures(label)),
    ),
  )
  try {
    await page.goto('/?q=acme')
    const status = page.getByRole('status', { name: 'Searching domains' })
    await expect(status).toBeVisible()
    await expect(status).toHaveAttribute('aria-atomic', 'true')
    const originalStatus = await status.elementHandle()
    expect(
      await status.evaluate(element => element.closest('[aria-busy="true"]')),
    ).toBeNull()
    await expect(page.locator('.skeleton').first()).toHaveCSS(
      'animation-name',
      'none',
    )
    releaseDomains()
    await expect(page.locator('.result-count')).toContainText(
      '60 of 556 domains checked',
    )
    expect(
      await originalStatus?.evaluate(
        element => element === document.querySelector('.result-count'),
      ),
    ).toBe(true)
  } finally {
    releaseDomains()
  }
})

test('quote buttons describe pricing and renewal terms, and failed searches describe their error', async ({
  page,
}) => {
  await mockDomainSearch(page)
  await page.goto('/?q=acme')
  await expect(
    page
      .locator('.domain-card')
      .getByRole('button', { name: 'Add acme.com to cart', exact: true }),
  ).toHaveAccessibleDescription('$12.00. Renews at $12.00 for 1 year')
  await mockDomainSearch(page, () => Effect.fail(SearchError.Unavailable()))
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('bad!')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAccessibleDescription(/Enter a domain name/)
})

test('long cart names and text spacing fit a narrow viewport without hiding removal controls', async ({
  page,
}) => {
  const width = 320
  await page.setViewportSize({ width, height: 900 })
  await mockDomainSearch(page)
  const label = 'a'.repeat(63)
  await page.goto(`/?q=${label}`)
  await page
    .locator('.domain-card')
    .getByRole('button', { name: `Add ${label}.com to cart`, exact: true })
    .click()
  await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
  const dialog = page.getByRole('dialog', { name: 'Your cart' })
  const remove = dialog.getByRole('button', {
    name: `Remove ${label}.com`,
    exact: true,
  })
  await expect(remove).toBeInViewport()
  expect(
    await dialog.evaluate(
      element => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
  await page.addStyleTag({
    content:
      '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  })
  await expect(remove).toBeInViewport()
  expect(
    await dialog.evaluate(
      element => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
})

test('custom filter backgrounds and modal text have readable contrast, and the cart controls its dialog', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockDomainSearch(page)
  await page.goto('/?q=acme')
  await expect(page.locator('.domain-card .price').first()).toBeVisible()
  const filterColors = await page
    .locator('.filters .filter-trigger')
    .evaluateAll(elements =>
      elements.map(element => {
        const style = getComputedStyle(element)
        return { color: style.color, background: style.backgroundColor }
      }),
    )
  for (const colors of filterColors) {
    expect(
      contrastRatio(colors.color, colors.background),
    ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST)
  }

  const trigger = page.getByRole('button', { name: 'Cart, 0 domains' })
  const controlledId = await trigger.getAttribute('aria-controls')
  if (controlledId === null) {
    throw new Error('The cart trigger must identify its dialog')
  }

  await expect(page.locator(`#${controlledId}`)).toHaveId(controlledId)
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Your cart' })
  await expect(dialog).toHaveId(controlledId)
  for (const selector of ['.empty-cart', '.demo-note']) {
    const paragraph = dialog.locator(selector)
    await paragraph.scrollIntoViewIfNeeded()
    const appearance = await paragraph.evaluate(element => {
      const panel = element.closest('.cart-panel')
      if (panel === null) {
        throw new Error('Cart text must be inside the dialog panel')
      }

      const range = document.createRange()
      range.selectNodeContents(element)
      return {
        color: getComputedStyle(element).color,
        background: getComputedStyle(panel).backgroundColor,
        isUnobscured: [...range.getClientRects()].every(rect =>
          panel.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          ),
        ),
      }
    })
    expect(
      contrastRatio(appearance.color, appearance.background),
    ).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST)
    expect(appearance.isUnobscured).toBe(true)
  }
})
