import { expect, test } from '@playwright/test'

test('serves unknown paths with HTTP 404 and recovers through the Worker', async ({
  page,
  request,
}) => {
  const head = await request.head('/')
  expect(head.status()).toBe(200)
  expect(await head.body()).toHaveLength(0)

  const response = await page.goto('/missing')
  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: '404 — Page Not Found' }),
  ).toBeVisible()
  await page.getByRole('link', { name: '← Back to Domains' }).click()
  await expect(page).toHaveURL('/')

  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('worker-search')
  await expect(page).toHaveURL(/q=worker-search/)
  await expect(page.locator('.domain-card').first()).toContainText(
    'worker-search.com',
  )
})

test('serves the RPC endpoint and bounds request bodies', async ({
  request,
}) => {
  const response = await request.post('/rpc', {
    data: { padding: 'x'.repeat(2000) },
  })
  expect(response.status()).toBe(413)
  expect(response.headers()['cache-control']).toBe('no-store')
})

for (const path of ['/', '/?q=foldkit']) {
  test(`serves sharing metadata without JavaScript at ${path}`, async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) {
      throw new Error('Sharing checks require the configured app URL')
    }

    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled: false,
    })

    try {
      const page = await context.newPage()
      await page.goto(path)

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        'content',
        'Domains by Foldkit',
      )
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        'https://domains.foldkit.dev/og/domains.png',
      )
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        'content',
        'https://domains.foldkit.dev/',
      )
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://domains.foldkit.dev/',
      )
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      )
      await expect(
        page.locator('meta[property="og:image:alt"]'),
      ).toHaveAttribute('content', /Cloudflare, Alchemy, Foldkit, and Effect/)
    } finally {
      await context.close()
    }
  })
}

test('serves the social image and touch icon as PNG assets', async ({
  request,
}) => {
  const pngWidthOffset = 16
  const pngHeightOffset = 20

  for (const asset of [
    { path: '/og/domains.png', width: 1200, height: 630 },
    { path: '/apple-touch-icon.png', width: 180, height: 180 },
    { path: '/favicon-32x32.png', width: 32, height: 32 },
  ]) {
    const response = await request.get(asset.path)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')

    const body = await response.body()
    expect(body.readUInt32BE(pngWidthOffset)).toBe(asset.width)
    expect(body.readUInt32BE(pngHeightOffset)).toBe(asset.height)
  }
})
