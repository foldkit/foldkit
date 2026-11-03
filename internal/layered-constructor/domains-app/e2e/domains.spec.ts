import { Array, Effect } from 'effect'

import {
  type Page as PlaywrightPage,
  devices,
  expect,
  test,
} from '@playwright/test'

import { Domain } from '../src/shared/domain'
import { makeDomainFixtures } from '../src/shared/domain.fixture'
import { SearchError } from '../src/shared/domainsRpc'
import { mockDomainSearch } from './api'
import * as Page from './page'

test.beforeEach(async ({ page }) => {
  await mockDomainSearch(page)
})

const holdEarlyScript = async (page: PlaywrightPage) => {
  let earlyScript = ''
  let releaseScript = () => {}
  const scriptGate = new Promise<void>(resolve => {
    releaseScript = resolve
  })
  await page.route('**/?q=from-url', async route => {
    const response = await route.fetch()
    const body = (await response.text()).replace(
      /<script>([\s\S]*?)<\/script>/,
      (_script, source: string) => {
        earlyScript = source
        return '<script src="/early-search.js"></script>'
      },
    )
    expect(earlyScript).toContain('domains:ready')
    await route.fulfill({ response, body })
  })
  await page.route('**/early-search.js', async route => {
    await scriptGate
    await route.fulfill({ contentType: 'text/javascript', body: earlyScript })
  })

  return releaseScript
}

test('serves an editable search field in static HTML', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await mockDomainSearch(page)
  await page.goto('/')
  await expect(
    page.getByRole('searchbox', { name: 'Search domains' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Find a domain forthe next viral idea.',
  )
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)
  await context.close()
})

test('activating Domains with the keyboard focuses the same search input and preserves navigation history', async ({
  page,
}) => {
  await page.goto('/?q=acme')
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  const originalInput = await input.elementHandle()
  const domainsHome = page.getByRole('link', { name: 'Domains home' })
  await domainsHome.focus()
  await domainsHome.press('Enter')
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await expect(page).toHaveURL('/')
  expect(
    await originalInput?.evaluate(
      element => element === document.getElementById('domain-search'),
    ),
  ).toBe(true)

  await page.goBack()
  await expect(input).toHaveValue('acme')
  await expect(page).toHaveURL(/q=acme/)
  await domainsHome.click()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
  await domainsHome.click()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('')
})

test('preserves early typing, focus, selection, and the input node through hydration', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(error.message))
  let releaseBundle = () => {}
  const bundleGate = new Promise<void>(resolve => {
    releaseBundle = resolve
  })
  await page.route('**/assets/*.js', async route => {
    await bundleGate
    await route.continue()
  })

  try {
    await page.goto('/?q=from-url', { waitUntil: 'commit' })
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    await expect(input).toHaveValue('from-url')
    await expect(input).toBeFocused()
    await expect(
      page.getByRole('status', { name: 'Searching domains' }),
    ).toBeVisible()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)
    const originalInput = await input.elementHandle()
    expect(originalInput).not.toBeNull()

    await input.fill('typed-before-hydration')
    await input.evaluate(element => {
      if (element instanceof HTMLInputElement) {
        element.setSelectionRange(3, 8)
      }
    })
    await expect(page).toHaveURL(/q=typed-before-hydration/)
    await expect(page.locator('.domain-card').first()).toContainText(
      'typed-before-hydration.com',
    )
    await expect(
      page.locator('.results-preview .domain-row').last(),
    ).toContainText('typed-before-hydration.')
    await expect(page.locator('.results .price')).toHaveCount(0)
    releaseBundle()

    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).toHaveValue('typed-before-hydration')
    await expect(input).toBeFocused()
    expect(
      await originalInput?.evaluate(
        element => element === document.getElementById('domain-search'),
      ),
    ).toBe(true)
    expect(
      await input.evaluate(element =>
        element instanceof HTMLInputElement
          ? [element.selectionStart, element.selectionEnd]
          : [],
      ),
    ).toEqual([3, 8])
    await expect(page.locator('.domain-card').first()).toContainText(
      'typed-before-hydration.com',
    )
    expect(errors).toEqual([])
  } finally {
    releaseBundle()
  }
})

test('preserves input typed before the early script arrives', async ({
  page,
}) => {
  const releaseScript = await holdEarlyScript(page)

  try {
    await page.goto('/?q=from-url', { waitUntil: 'commit' })
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    await input.fill('typed-during-stream')
    releaseScript()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).toHaveValue('typed-during-stream')
    await expect(input).toBeFocused()
    await expect(page).toHaveURL(/q=typed-during-stream/)
    await expect(page.locator('.domain-card').first()).toContainText(
      'typed-during-stream.com',
    )
  } finally {
    releaseScript()
  }
})

test('prefills the URL query after the field receives early focus', async ({
  page,
}) => {
  const releaseScript = await holdEarlyScript(page)

  try {
    await page.goto('/?q=from-url', { waitUntil: 'commit' })
    const input = page.getByRole('searchbox', { name: 'Search domains' })
    await input.click()
    await expect(input).toHaveValue('')
    releaseScript()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).toHaveValue('from-url')
    await expect(input).toBeFocused()
    await expect(page).toHaveURL(/q=from-url/)
    await expect(page.locator('.domain-card').first()).toContainText(
      'from-url.com',
    )
  } finally {
    releaseScript()
  }
})

test('first mobile tap moves the same input into the second header row before hydration', async ({
  browser,
  baseURL,
}, testInfo) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({ ...devices['iPhone 13'], baseURL })
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
    await expect(input).not.toBeFocused()
    await expect
      .poll(async () => (await input.boundingBox())?.y)
      .toBeGreaterThan(200)
    await input.tap()
    await expect(input).toBeFocused()
    await expect
      .poll(async () => (await input.boundingBox())?.y)
      .toBeCloseTo(76, 0)
    await input.fill('mobile-idea')
    releaseBundle()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await expect(input).toHaveValue('mobile-idea')
    await expect(input).toBeFocused()
    expect(await originalInput?.evaluate(element => element.isConnected)).toBe(
      true,
    )
    await expect(page.locator('.domain-card').first()).toContainText(
      'mobile-idea.com',
    )
    await page.screenshot({ path: testInfo.outputPath('domains-mobile.png') })
  } finally {
    releaseBundle()
    await context.close()
  }
})

test('mobile search scrolls with the hero and stays pinned during a search', async ({
  browser,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error('The domain example requires a base URL')
  }

  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 500 },
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
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  const header = page.locator('.header')
  const assertHeroScroll = async () => {
    await expect(page.locator('form.search')).toHaveCSS('position', 'absolute')
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    const documentTop = await input.evaluate(
      element => element.getBoundingClientRect().top,
    )

    await page.evaluate(() => window.scrollTo(0, 100))
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
    await expect
      .poll(() =>
        input.evaluate(
          element => element.getBoundingClientRect().top + window.scrollY,
        ),
      )
      .toBeCloseTo(documentTop, 0)
    await expect
      .poll(() =>
        header.evaluate(element => element.getBoundingClientRect().top),
      )
      .toBe(0)
  }

  try {
    await page.goto('/', { waitUntil: 'commit' })
    await expect(input).toBeVisible()
    await expect(input).not.toBeFocused()
    const originalInput = await input.elementHandle()
    await assertHeroScroll()

    releaseBundle()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
    await assertHeroScroll()

    await input.tap()
    await expect(input).toBeFocused()
    await input.fill('scrolling-search')
    await expect(page.locator('.domain-card').first()).toContainText(
      'scrolling-search.com',
    )
    await page.evaluate(() => window.scrollTo(0, 100))
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
    await expect
      .poll(() =>
        input.evaluate(element => element.getBoundingClientRect().top),
      )
      .toBeCloseTo(76, 0)
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('scrolling-search')
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

test('searches, filters, sorts, and manages the cart', async ({
  page,
}, testInfo) => {
  await Page.assertLoadedCleanly(page)
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('foldkit')
  await expect(page.locator('.domain-card').first()).toContainText(
    'foldkit.com',
  )
  await expect(page.locator('.domain-card').first()).toContainText(
    'Not available',
  )
  await page.screenshot({ path: testInfo.outputPath('domains-desktop.png') })
  await Page.chooseFilterOption(page, 'Filter availability', 'Available')
  await expect(page.locator('.result-count')).toHaveText(
    '554 domains · Registration prices in USD',
  )
  expect(
    await page.locator('#domain-results .domain-row').count(),
  ).toBeLessThan(60)
  await Page.chooseFilterOption(page, 'Sort results', 'Price: Low to High')
  await expect(
    page.locator('#domain-results .domain-row').first(),
  ).toContainText('$1.99')
  await Page.chooseFilterOption(page, 'Filter by TLD', '.com')
  await expect(page.getByRole('status')).toContainText([
    'No domains match',
    '0 domains',
  ])
  await Page.chooseFilterOption(page, 'Filter by TLD', '.app')
  await page
    .locator('.all-results')
    .getByRole('button', { name: 'Add foldkit.app to cart' })
    .click()
  await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
  await expect(page.getByRole('region', { name: 'Your cart' })).toContainText(
    'foldkit.app',
  )
  await page
    .getByRole('button', { name: 'Remove foldkit.app', exact: true })
    .click()
  await expect(page.getByRole('region', { name: 'Your cart' })).toContainText(
    'Your next idea starts with a name.',
  )
  await page.getByRole('button', { name: 'Close cart panel' }).click()
  await expect(page.getByRole('region', { name: 'Your cart' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Cart,/ })).toBeFocused()
  await input.press('Escape')
  await expect(input).toHaveValue('')
  await expect(page).toHaveURL('/')
})

test('updates domain names while prices and availability wait for the current lookup', async ({
  page,
}, testInfo) => {
  await Page.assertLoadedCleanly(page)
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)

  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('foldkit')
  await expect(page.locator('.domain-card').first()).toContainText(
    'Not available',
  )
  await expect(page.locator('.results .price').first()).toBeVisible()

  let releasePrices = () => {}
  const pricesGate = new Promise<void>(resolve => {
    releasePrices = resolve
  })
  await mockDomainSearch(page, label =>
    Effect.promise(() => pricesGate).pipe(Effect.as(makeDomainFixtures(label))),
  )

  await input.fill('new-idea')
  await expect(page.locator('.domain-card h3')).toHaveText([
    'new-idea.com',
    'new-idea.dev',
    'new-idea.app',
    'new-idea.io',
  ])
  await expect(
    page.locator('#domain-results .domain-row').first(),
  ).toContainText('new-idea.com')
  await expect(
    page.locator('#domain-results .domain-row').last(),
  ).toContainText('new-idea.')
  await expect(page.locator('.results .price')).toHaveCount(0)
  await expect(page.locator('.results .unavailable')).toHaveCount(0)
  await expect(page.locator('.results .domain-action button')).toHaveCount(0)
  await expect(
    page.getByRole('status', { name: 'Searching domains' }),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('domains-pending.png') })

  await input.pressSequentially('s')
  await expect(page.locator('.domain-card').first()).toContainText(
    'new-ideas.com',
  )
  await expect(page.locator('.results .price')).toHaveCount(0)
  releasePrices()
  await expect(page.locator('.domain-card').first()).toContainText('$12.00')
  await expect(
    page.locator('.domain-card').first().getByRole('button'),
  ).toHaveAccessibleName('Add new-ideas.com to cart')
})

for (const width of [1440, 900, 390, 320]) {
  test(`quote skeletons preserve card, row, and control geometry at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })

    for (const label of ['acme', 'foldkit', 'a-long-domain-name-for-layout']) {
      let releaseDomains = () => {}
      const domainsGate = new Promise<void>(resolve => {
        releaseDomains = resolve
      })
      await mockDomainSearch(page, query =>
        Effect.promise(() => domainsGate).pipe(
          Effect.as(
            Array.map(makeDomainFixtures(query), domain =>
              domain._tag === 'Available' && domain.tld === 'io'
                ? Domain.Available({ ...domain, price: 160, years: 2 })
                : domain,
            ),
          ),
        ),
      )

      try {
        await page.goto(`/?q=${label}`)
        await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
        await expect(page.locator('.domain-card .skeleton-action')).toHaveCount(
          4,
        )
        await expect(
          page.locator('#domain-results .domain-row').first(),
        ).toBeVisible()
        const skeletonControls = await page
          .locator(
            '.domain-card .skeleton-action, #domain-results .skeleton-action',
          )
          .evaluateAll(elements =>
            elements.slice(0, 10).map(element => {
              const rect = element.getBoundingClientRect()
              return { width: rect.width, height: rect.height }
            }),
          )
        const geometry = () =>
          page
            .locator('.domain-card, #domain-results .domain-row')
            .evaluateAll(elements =>
              elements.slice(0, 10).map(element => {
                const bounds = (target: Element | null) => {
                  if (target === null) {
                    throw new Error(
                      'Each result must reserve its name and action areas',
                    )
                  }

                  const rect = target.getBoundingClientRect()
                  return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  }
                }

                return {
                  name: element.querySelector('h3, .domain-name')?.textContent,
                  result: bounds(element),
                  nameArea: bounds(element.querySelector('h3, .domain-name')),
                  action: bounds(element.querySelector('.domain-action')),
                }
              }),
            )
        const surroundingGeometry = () =>
          page
            .locator('.results-heading, .all-results, .result-count, .footer')
            .evaluateAll(elements =>
              elements.map(element => {
                const rect = element.getBoundingClientRect()
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                }
              }),
            )
        const pendingGeometry = await geometry()
        const pendingSurroundings = await surroundingGeometry()
        await page.screenshot({
          path: testInfo.outputPath(`${label}-pending.png`),
        })
        releaseDomains()
        await expect(page.locator('.domain-card .skeleton-action')).toHaveCount(
          0,
        )
        await expect(page.locator('.domain-card').last()).toContainText(
          '$160.00 / 2 years',
        )
        await expect.poll(geometry).toEqual(pendingGeometry)
        await expect.poll(surroundingGeometry).toEqual(pendingSurroundings)
        const loadedControls = await page
          .locator('.domain-card .icon-button, #domain-results .icon-button')
          .evaluateAll(elements =>
            elements.slice(0, 10).map(element => {
              const rect = element.getBoundingClientRect()
              return { width: rect.width, height: rect.height }
            }),
          )
        const cardControlSize = width <= 700 ? 44 : 32
        const rowControlSize = width <= 700 ? 44 : 30
        expect(skeletonControls.slice(0, 4)).toEqual(
          Array.makeBy(4, () => ({
            width: cardControlSize,
            height: cardControlSize,
          })),
        )
        expect(skeletonControls.slice(4)).toEqual(
          skeletonControls
            .slice(4)
            .map(() => ({ width: rowControlSize, height: rowControlSize })),
        )
        for (const control of loadedControls) {
          expect([cardControlSize, rowControlSize]).toContain(control.width)
          expect(control.height).toBe(control.width)
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width)
        await page.screenshot({
          path: testInfo.outputPath(`${label}-loaded.png`),
        })
      } finally {
        releaseDomains()
      }
    }
  })
}

test('restores queries on reload and browser navigation and ignores superseded searches', async ({
  page,
}) => {
  await page.goto('/')
  await page.goto('/?q=acme')
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await expect(input).toHaveValue('acme')
  await input.fill('first-query')
  await input.fill('latest-query')
  await expect(page.locator('.domain-card').first()).toContainText(
    'latest-query.com',
  )
  await page.reload()
  await expect(input).toHaveValue('latest-query')
  await expect(page.locator('.domain-card').first()).toContainText(
    'latest-query.com',
  )
  await page.goBack()
  await expect(input).toHaveValue('')
  await page.goForward()
  await expect(input).toHaveValue('latest-query')
  await input.fill('not a domain!')
  await expect(page.getByRole('alert')).toContainText('Enter a domain name')
  await input.fill('valid-domain')
  await expect(page.locator('.domain-card').first()).toContainText(
    'valid-domain.com',
  )
})

test('virtualizes the catalog and preserves scrolling and cart selections across query changes', async ({
  page,
}) => {
  await page.goto('/?q=acme')
  const viewport = page.locator('#domain-results')
  const rows = viewport.locator('.domain-row')
  await expect(page.locator('.result-count')).toHaveText(
    '60 of 556 domains checked · Registration prices in USD',
  )
  await expect(rows.first()).toContainText('acme.com')
  expect(await rows.count()).toBeLessThan(60)
  await expect(viewport.getByText('acme.zone', { exact: true })).toHaveCount(0)

  await expect
    .poll(async () => {
      await Page.scrollResultsToEnd(page)
      return rows.last().textContent()
    })
    .toContain('acme.zone')
  await expect(viewport.getByText('acme.com', { exact: true })).toHaveCount(0)
  expect(await rows.count()).toBeLessThan(60)
  await viewport.getByRole('button', { name: 'Add acme.zone to cart' }).click()

  const anchorKey = await viewport
    .locator('[data-virtual-list-item-key]')
    .evaluateAll(elements => {
      const row = elements.find(
        element => element.getBoundingClientRect().bottom > 0,
      )
      if (row === undefined) {
        throw new Error('A visible virtual row is required before resizing')
      }
      return row.getAttribute('data-virtual-list-item-key')
    })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    viewport.locator(`[data-virtual-list-item-key="${anchorKey}"]`),
  ).toBeInViewport()
  await expect
    .poll(async () => {
      await Page.scrollResultsToEnd(page)
      return viewport
        .getByRole('button', { name: 'Remove acme.zone from cart' })
        .count()
    })
    .toBe(1)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390)

  await page.getByRole('searchbox', { name: 'Search domains' }).fill('fresh')
  await expect
    .poll(() =>
      viewport
        .locator('[data-domain-label]')
        .evaluateAll(
          elements =>
            elements.length > 0 &&
            elements.every(element => element.textContent === 'fresh'),
        ),
    )
    .toBe(true)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  await expect(page.locator('.result-count')).toContainText(
    'of 556 domains checked',
  )
  await expect
    .poll(async () => {
      await Page.scrollResultsToEnd(page)
      return rows.last().textContent()
    })
    .toContain('fresh.zone')
  await page
    .getByRole('button', { name: 'Filters and sort', exact: true })
    .click()
  const filtersDialog = page.getByRole('dialog', { name: 'Filters and sort' })
  await filtersDialog
    .getByRole('button', { name: 'Price', exact: true })
    .click()
  await expect(filtersDialog).toBeHidden()
  await expect
    .poll(async () => {
      await Page.scrollResultsToOffset(page, 0)
      return rows.first().textContent()
    })
    .toContain('fresh.space')
  await Page.chooseFilterOption(page, 'Filter by TLD', '.app')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('fresh.app')
  await expect(rows.first()).toBeInViewport({ ratio: 1 })

  await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
  await expect(page.getByRole('region', { name: 'Your cart' })).toContainText(
    'acme.zone',
  )
})

test('hands URL synchronization to the Runtime without leaving duplicate early listeners', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const replaceState = history.replaceState.bind(history)

    history.replaceState = (data, unused, url) => {
      const count = Number(
        document.documentElement.dataset['historyReplacements'] ?? '0',
      )
      document.documentElement.dataset['historyReplacements'] = String(
        count + 1,
      )
      replaceState(data, unused, url)
    }
    document.addEventListener('domains:ready', () => {
      const count = Number(
        document.documentElement.dataset['domainsReadyEvents'] ?? '0',
      )
      document.documentElement.dataset['domainsReadyEvents'] = String(count + 1)
    })
  })

  await Page.assertLoadedCleanly(page)
  await expect(page.locator('html')).toHaveAttribute(
    'data-domains-ready-events',
    '1',
  )
  const before = Number(
    await page.locator('html').getAttribute('data-history-replacements'),
  )

  await page
    .getByRole('searchbox', { name: 'Search domains' })
    .fill('after-handoff')
  await expect(page).toHaveURL(/q=after-handoff/)
  await expect(page.locator('html')).toHaveAttribute(
    'data-history-replacements',
    String(before + 1),
  )
  await expect(page.locator('.domain-card').first()).toContainText(
    'after-handoff.com',
  )
})

test('backspacing to a loaded query restores quotes without waiting for debounce or RPC', async ({
  page,
}) => {
  await page.clock.install()
  const windows: Array<{ label: string; offset: number; limit: number }> = []
  await mockDomainSearch(page, (label, window) =>
    Effect.sync(() => {
      windows.push({ label, ...window })
      return makeDomainFixtures(label)
    }),
  )
  await page.goto('/?q=devin')
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  const card = page.locator('.domain-card').first()
  await expect(card).toContainText('devin.com')
  await expect(card).toContainText('$12.00')
  await expect(
    page.getByText('60 of 556 domains checked · Registration prices in USD', {
      exact: true,
    }),
  ).toBeVisible()

  await input.fill('devins')
  await expect(card).toContainText('devins.com')
  await expect(card).toContainText('$12.00')
  await expect(
    page.getByText('60 of 556 domains checked · Registration prices in USD', {
      exact: true,
    }),
  ).toBeVisible()
  expect(windows).toEqual([
    { label: 'devin', offset: 0, limit: 4 },
    { label: 'devin', offset: 4, limit: 56 },
    { label: 'devins', offset: 0, limit: 4 },
    { label: 'devins', offset: 4, limit: 56 },
  ])

  const nowMillis = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(nowMillis + 100)
  await input.press('Backspace')
  await page.clock.runFor(16)

  await expect(input).toHaveValue('devin')
  await expect(input).toBeFocused()
  await expect(page).toHaveURL(/q=devin$/)
  await expect(card).toContainText('devin.com')
  await expect(card).toContainText('$12.00')
  await expect(
    page.getByText('60 of 556 domains checked · Registration prices in USD', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(card.locator('.skeleton-price')).toHaveCount(0)
  expect(windows).toEqual([
    { label: 'devin', offset: 0, limit: 4 },
    { label: 'devin', offset: 4, limit: 56 },
    { label: 'devins', offset: 0, limit: 4 },
    { label: 'devins', offset: 4, limit: 56 },
  ])

  await page.clock.runFor(61_000)
  await page.clock.resume()
  await input.fill('devins')
  await expect(card).toContainText('devins.com')
  await expect(card).toContainText('$12.00')
  await expect(
    page.getByText('60 of 556 domains checked · Registration prices in USD', {
      exact: true,
    }),
  ).toBeVisible()
  expect(windows).toEqual([
    { label: 'devin', offset: 0, limit: 4 },
    { label: 'devin', offset: 4, limit: 56 },
    { label: 'devins', offset: 0, limit: 4 },
    { label: 'devins', offset: 4, limit: 56 },
    { label: 'devins', offset: 0, limit: 4 },
    { label: 'devins', offset: 4, limit: 56 },
  ])
})

test('failed lookups hide prices and recover through explicit retry', async ({
  page,
}) => {
  let calls = 0
  await mockDomainSearch(page, label =>
    Effect.suspend(() => {
      calls += 1
      return calls === 1
        ? Effect.fail(SearchError.Unavailable())
        : Effect.succeed(makeDomainFixtures(label))
    }),
  )
  await page.goto('/?q=retry-idea')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.results .price')).toHaveCount(0)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.domain-card').first()).toContainText('$12.00')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(
    page.getByRole('searchbox', { name: 'Search domains' }),
  ).toHaveValue('retry-idea')
})

test('shows multi-year registration and renewal quotes without treating an unconfirmed name as purchasable', async ({
  page,
}) => {
  await mockDomainSearch(page, () =>
    Effect.succeed([
      Domain.Unconfirmed({ name: 'quoted.com', tld: 'com' }),
      Domain.Available({
        name: 'quoted.ai',
        tld: 'ai',
        years: 2,
        price: 160,
        renewalPrice: 170,
        isPremium: true,
      }),
    ]),
  )
  await page.goto('/?q=quoted')
  const unconfirmed = page.locator('.domain-card').first()
  await expect(unconfirmed).toContainText('Not available')
  await expect(unconfirmed.locator('.unavailable')).toHaveAttribute(
    'title',
    'This sample domain is marked unavailable in the demo data.',
  )
  await expect(unconfirmed.getByRole('button')).toHaveCount(0)
  await Page.chooseFilterOption(page, 'Filter by TLD', '.ai')
  const quoted = page.locator('#domain-results .domain-row').first()
  await expect(quoted.locator('.price')).toHaveText('$160.00 / 2 years')
  await expect(quoted.locator('.price')).toHaveAttribute(
    'title',
    'Premium domain. Renews at $170.00 for 2 years',
  )
  await quoted.getByRole('button', { name: 'Add quoted.ai to cart' }).click()
  await page.getByRole('button', { name: 'Cart, 1 domains' }).click()
  const cart = page.getByRole('region', { name: 'Your cart' })
  await expect(cart).toContainText('Renews at $170.00 for 2 years')
  await expect(cart.locator('.cart-total')).toHaveText(
    'Registration total$160.00',
  )
  await expect(cart).toContainText(
    'No domains are reserved. No purchases are made.',
  )
})

test('loads quotes for the visible catalog pages and preserves prices when a later page needs retry', async ({
  page,
}) => {
  const windows: Array<{ offset: number; limit: number }> = []
  let isLaterPageFailing = true
  await mockDomainSearch(page, (label, window) =>
    Effect.suspend(() => {
      windows.push(window)
      return window.offset === 60 && isLaterPageFailing
        ? Effect.fail(SearchError.Unavailable())
        : Effect.succeed(makeDomainFixtures(label))
    }),
  )
  await page.goto('/?q=progressive')
  await expect(page.locator('.domain-card').first()).toContainText('$12.00')
  await page.waitForLoadState('networkidle')
  expect(windows).toEqual([
    { offset: 0, limit: 4 },
    { offset: 4, limit: 56 },
  ])
  const viewport = page.locator('#domain-results')
  await Page.scrollResultsToOffset(page, 1140)
  await expect(page.getByRole('alert')).toContainText(
    'Could not load sample domains. Please try again.',
  )
  await expect(page.locator('.domain-card').first()).toContainText('$12.00')
  expect(windows).toEqual([
    { offset: 0, limit: 4 },
    { offset: 4, limit: 56 },
    { offset: 60, limit: 60 },
  ])
  isLaterPageFailing = false
  const retry = page.getByRole('button', { name: 'Try again' })
  await expect(retry).toBeInViewport()
  const retryScrollTop = await page.evaluate(() => window.scrollY)
  await retry.click()
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(retryScrollTop)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(viewport.locator('.skeleton-price')).toHaveCount(0)
  expect(windows).toEqual([
    { offset: 0, limit: 4 },
    { offset: 4, limit: 56 },
    { offset: 60, limit: 60 },
    { offset: 60, limit: 60 },
  ])
  await Page.chooseFilterOption(page, 'Sort results', 'Price: Low to High')
  await expect
    .poll(() =>
      windows.some(window => window.offset === 0 && window.limit === 556),
    )
    .toBe(true)
  await expect(page.locator('.result-count')).toHaveText(
    '556 domains · Registration prices in USD',
  )
  await Page.scrollResultsToOffset(page, 0)
  await expect(viewport.locator('.domain-row').first()).toContainText('$1.99')
})

for (const width of [1440, 390]) {
  test(`ships Inspect DevTools while searches and virtual results stay live at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    let releaseDomains = () => {}
    let isSearchStarted = false
    const domainsGate = new Promise<void>(resolve => {
      releaseDomains = resolve
    })
    await mockDomainSearch(page, label =>
      Effect.gen(function* () {
        if (label === 'devtools-search') {
          isSearchStarted = true
          yield* Effect.promise(() => domainsGate)
        }

        return makeDomainFixtures(label)
      }),
    )

    try {
      await page.goto('/?q=acme')
      const input = page.getByRole('searchbox', { name: 'Search domains' })
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await expect(page.locator('.result-count')).toHaveText(
        '60 of 556 domains checked · Registration prices in USD',
      )
      const badge = page.locator('.dt-badge')
      const panel = page.locator('.dt-panel')
      await expect(badge).toBeInViewport()
      await expect(panel).toHaveCount(0)
      await input.fill('devtools-search')
      await expect.poll(() => isSearchStarted).toBe(true)
      await expect(page.locator('.domain-card .price')).toHaveCount(0)
      await badge.click()
      await expect(panel).toBeVisible()
      await expect(panel).toContainText('while the app stays live.')
      const domainMessages = panel
        .locator('.message-list')
        .getByText('GotDomainsQueryMessage', { exact: true })
      const previousDomainMessages = await domainMessages.count()
      await domainMessages.first().click()
      await expect(panel.locator('header')).toContainText(/Inspecting \(\d+\)/)
      await expect(page.locator('.dt-interaction-blocker')).toHaveCount(0)
      await expect(input).toHaveValue('devtools-search')
      await expect(page.locator('.domain-card').first()).toContainText(
        'devtools-search.com',
      )
      releaseDomains()
      await expect(page.locator('.result-count')).toHaveText(
        '60 of 556 domains checked · Registration prices in USD',
      )
      await expect(domainMessages).toHaveCount(previousDomainMessages + 2)
      await expect(panel.locator('header')).toContainText(/Inspecting \(\d+\)/)
      await expect(input).toHaveValue('devtools-search')
      await expect(page).toHaveURL(/q=devtools-search/)
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath('devtools-inspect.png'),
      })
      await badge.click()
      await expect(panel).toHaveCount(0)
      const viewport = page.locator('#domain-results')
      const rows = viewport.locator('.domain-row')
      await expect
        .poll(async () => {
          await Page.scrollResultsToEnd(page)
          return rows.last().textContent()
        })
        .toContain('devtools-search.zone')
      expect(await rows.count()).toBeLessThan(60)
      await input.fill('devtools-next')
      await expect(page.locator('.domain-card').first()).toContainText(
        'devtools-next.com',
      )
      await expect(page.locator('.domain-card .price').first()).toBeVisible()
    } finally {
      releaseDomains()
    }
  })
}

test('typing debounces intermediate keystrokes and loads the final query progressively', async ({
  page,
}) => {
  await page.clock.install()
  const requests: Array<{ label: string; offset: number; limit: number }> = []
  await mockDomainSearch(page, (label, range) => {
    requests.push({ label, ...range })
    return Effect.succeed(makeDomainFixtures(label))
  })
  await page.goto('/')
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  const nowMillis = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(nowMillis + 100)
  await input.focus()

  for (const character of ['d', 'e', 'v', 'i', 'n']) {
    await input.pressSequentially(character)
    await page.clock.runFor(50)
  }

  await expect(input).toHaveValue('devin')
  await expect(page).toHaveURL(/q=devin$/)
  expect(requests).toEqual([])

  await page.clock.resume()
  await expect(page.locator('.domain-card').first()).toContainText('devin.com')
  await expect(page.locator('.domain-card .price').first()).toHaveText('$12.00')
  await expect(
    page.getByText('60 of 556 domains checked · Registration prices in USD', {
      exact: true,
    }),
  ).toBeVisible()
  expect(requests).toEqual([
    { label: 'devin', offset: 0, limit: 4 },
    { label: 'devin', offset: 4, limit: 56 },
  ])
})

for (const { name, width } of [
  { name: 'mobile', width: 390 },
  { name: 'desktop', width: 1280 },
]) {
  test(`changing sort order preserves page position on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/?q=acme')
    await expect(page.locator('.domain-card .price').first()).toBeVisible()
    const sortTriggerName =
      name === 'mobile' ? 'Filters and sort' : 'Sort results'

    for (const option of [
      name === 'mobile' ? 'Price' : 'Price: Low to High',
      'Alphabetical',
      'Length',
      'Relevance',
    ]) {
      if (option !== (name === 'mobile' ? 'Price' : 'Price: Low to High')) {
        await page.evaluate(() =>
          window.scrollTo({ top: 120, behavior: 'instant' }),
        )
      }

      const trigger = page.getByRole('button', {
        name: sortTriggerName,
        exact: false,
      })
      await trigger.click()
      const beforeScrollY = await page.evaluate(() => window.scrollY)
      const choices =
        name === 'mobile'
          ? page.getByRole('dialog', { name: 'Filters and sort' })
          : page.getByRole('listbox', { name: 'Sort results', exact: false })
      const choice = choices.getByRole(
        name === 'mobile' ? 'button' : 'option',
        { name: option, exact: true },
      )
      await choice.click()
      await expect(choices).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect(
        page.locator('#domain-results .domain-row').first(),
      ).toBeVisible()
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBe(beforeScrollY)
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => window.scrollY)).toBe(beforeScrollY)
    }
  })
}
