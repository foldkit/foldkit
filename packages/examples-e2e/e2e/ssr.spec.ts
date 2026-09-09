import { type Page as BrowserPage, expect, test } from '@playwright/test'

import * as Page from '../page'

// The served markup and the DOM a browser builds fresh have to describe the
// same thing. A later `selected` option and the DOM value setter disagree about
// ownership, and an HTML parser drops one newline after a <pre> or <textarea>
// start tag that assigning `innerHTML` keeps, so each is read here once with
// scripting off and once hydrated.
const readEquivalence = (page: BrowserPage) =>
  page.evaluate(() => {
    const select = document.querySelector('#equivalence-select')
    const firstOption =
      select instanceof HTMLSelectElement ? select.options.item(0) : null
    const secondOption =
      select instanceof HTMLSelectElement ? select.options.item(1) : null
    const pre = document.querySelector('#equivalence-pre')
    const textarea = document.querySelector('#equivalence-textarea')
    return {
      firstDefaultSelected: firstOption?.defaultSelected ?? null,
      firstHasSelected: firstOption?.hasAttribute('selected') ?? null,
      firstSelected: firstOption?.selected ?? null,
      selectValue: select instanceof HTMLSelectElement ? select.value : null,
      selectedIndex:
        select instanceof HTMLSelectElement ? select.selectedIndex : null,
      secondDefaultSelected: secondOption?.defaultSelected ?? null,
      secondHasSelected: secondOption?.hasAttribute('selected') ?? null,
      secondSelected: secondOption?.selected ?? null,
      preText: pre === null ? null : pre.textContent,
      textareaValue:
        textarea instanceof HTMLTextAreaElement ? textarea.value : null,
    }
  })

test.describe('ssr example', () => {
  test('builds the same DOM from served markup as it does hydrated', async ({
    browser,
  }) => {
    const withoutScript = await browser.newContext({ javaScriptEnabled: false })
    const servedPage = await withoutScript.newPage()
    await servedPage.goto('/')
    const served = await readEquivalence(servedPage)
    await withoutScript.close()

    const hydratedPage = await browser.newPage()
    await hydratedPage.goto('/', { waitUntil: 'networkidle' })
    const hydrated = await readEquivalence(hydratedPage)
    await hydratedPage.close()

    expect(served.selectValue).not.toBeNull()
    expect(served).toEqual(hydrated)
    // The select's own value owns the selection, not the later `selected`.
    expect(served.selectValue).toBe('a')
    expect(served.selectedIndex).toBe(0)
    expect({
      firstDefaultSelected: served.firstDefaultSelected,
      firstHasSelected: served.firstHasSelected,
      firstSelected: served.firstSelected,
      secondDefaultSelected: served.secondDefaultSelected,
      secondHasSelected: served.secondHasSelected,
      secondSelected: served.secondSelected,
    }).toEqual({
      firstDefaultSelected: true,
      firstHasSelected: true,
      firstSelected: true,
      secondDefaultSelected: false,
      secondHasSelected: false,
      secondSelected: false,
    })
    // The leading newline survives the parser's strip on both sides.
    expect(served.preText).toBe('\nleading')
    expect(served.textareaValue).toBe('\nleading')
  })

  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('serves rendered HTML before any JavaScript runs', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')

    await expect(page.locator('#count')).toHaveText('0')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)

    await context.close()
  })

  test('hydrates the server DOM and replays the server flags', async ({
    page,
  }) => {
    await Page.captureServerRoot(page)
    await page.goto('/', { waitUntil: 'networkidle' })

    await Page.assertAdoptedServerRoot(page)
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )

    await page.getByRole('button', { name: '+' }).click()
    await expect(page.locator('#count')).toHaveText('1')
    await expect(page).toHaveTitle('Count 1')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
  })

  test('renders the persisted count on reload', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.locator('#count')).toHaveText('2')

    await page.reload({ waitUntil: 'commit' })
    await expect(page.locator('#count')).toHaveText('2')
    await expect(page.locator('#provenance')).toContainText(
      'Rendered on the Server',
    )
  })

  // A percent-encoded slash decodes to `//index.html`, which the static file
  // server resolves to the unfilled template. The host guard normalizes the
  // path the same way and renders the application instead, so the response
  // must carry the hydration stamp rather than the raw shell.
  test('renders the application for a percent-encoded path to index.html', async ({
    request,
  }) => {
    const response = await request.get('/%2findex.html')

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('data-foldkit-app')
  })

  // A browser fetches scripts and stylesheets with `Accept: */*`, which accepts
  // HTML. Answering a miss with the app shell at 200 turns a stale deployment
  // into a blank page instead of the 404 it is.
  test('returns 404 rather than the app shell for a missing asset', async ({
    request,
  }) => {
    for (const path of [
      '/assets/stale-hash.js',
      '/assets/stale-hash.css',
      '/assets/stale-hash.js.map',
      '/assets/missing.png',
    ]) {
      const response = await request.get(path, {
        headers: { accept: '*/*' },
      })

      expect(response.status(), path).toBe(404)
      expect(await response.text()).not.toContain('data-foldkit-app')
    }
  })

  test('returns 404 for a missing asset fetched as a subresource', async ({
    request,
  }) => {
    const response = await request.get('/deep/stale-chunk', {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status()).toBe(404)
  })

  // The same extensionless URL answers 404 to a script request and HTML to a
  // navigation, so the refusal must declare the header it turned on. Without
  // that, a shared cache could store the 404 a cross-site script request
  // produced and serve it for the real page.
  test('declares Sec-Fetch-Dest on a refusal that depends on it', async ({
    request,
  }) => {
    const asScript = await request.get('/deep/stale-chunk', {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })
    expect(asScript.status()).toBe(404)
    expect((asScript.headers()['vary'] ?? '').toLowerCase()).toContain(
      'sec-fetch-dest',
    )

    const asDocument = await request.get('/deep/stale-chunk', {
      headers: { accept: 'text/html', 'sec-fetch-dest': 'document' },
    })
    expect(asDocument.status()).toBe(200)
    expect(await asDocument.text()).toContain('data-foldkit-app')
  })

  test('does not vary a refusal the path alone settles', async ({
    request,
  }) => {
    const response = await request.get('/assets/stale-hash.js', {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status()).toBe(404)
    expect((response.headers()['vary'] ?? '').toLowerCase()).not.toContain(
      'sec-fetch-dest',
    )
  })

  test('returns 404 for a missing asset requested with HEAD', async ({
    request,
  }) => {
    const response = await request.head('/assets/stale-hash.js', {
      headers: { accept: '*/*' },
    })

    expect(response.status()).toBe(404)
  })

  test('still renders a deep route that accepts anything', async ({
    request,
  }) => {
    const response = await request.get('/', {
      headers: { accept: '*/*' },
    })

    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('data-foldkit-app')
  })

  // The request target is not a URL: `//evil.example/` resolves against the
  // host origin to `http://evil.example/`. The host refuses it rather than
  // handing the entry an origin the client chose.
  test('refuses a request target that names another origin', async ({
    baseURL,
  }) => {
    const response = await Page.requestWithTarget(
      baseURL ?? '',
      '//evil.example/',
    )

    expect(response.status).toBe(400)
    expect(response.body).not.toContain('data-foldkit-app')
  })
})
