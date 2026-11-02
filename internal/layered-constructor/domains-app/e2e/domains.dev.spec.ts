import { expect, test } from '@playwright/test'

import { mockDomainSearch } from './api'

test('styles the initial development HTML before client JavaScript runs', async ({
  page,
}) => {
  let releaseScripts = () => {}
  const scriptGate = new Promise<void>(resolve => {
    releaseScripts = resolve
  })
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') {
      await scriptGate
    }

    await route.continue()
  })

  try {
    await page.goto('/', { waitUntil: 'commit' })
    await expect(
      page.getByRole('searchbox', { name: 'Search domains' }),
    ).toBeVisible()
    await expect(page.locator('[data-foldkit-app]')).toHaveCount(1)
    await expect(page.locator('head link[rel="stylesheet"]')).toHaveCount(1)
    await expect(page.locator('.results')).toBeHidden()
    await expect(page.locator('.brand')).toHaveCSS(
      'color',
      'rgb(237, 237, 237)',
    )
  } finally {
    releaseScripts()
  }
})

test('serves unknown paths with HTTP 404 and a route back to domain search', async ({
  page,
}, testInfo) => {
  await mockDomainSearch(page)
  const response = await page.goto('/missing')

  expect(response?.status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: '404 — Page Not Found' }),
  ).toBeVisible()
  await expect(
    page.getByText('The path "/missing" was not found.'),
  ).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('domains-not-found.png') })
  await page.getByRole('link', { name: '← Back to Domains' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
  const input = page.getByRole('searchbox', { name: 'Search domains' })
  await input.fill('back-home')
  await expect(page.locator('.domain-card').first()).toContainText(
    'back-home.com',
  )
})

test('hydrates a query with coordinated development identity and loads its quotes', async ({
  page,
}) => {
  await mockDomainSearch(page)
  const errors: Array<string> = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?q=dev-query')
  await expect(page.locator('[data-foldkit-app]')).toHaveCount(0)
  await expect(
    page.getByRole('searchbox', { name: 'Search domains' }),
  ).toHaveValue('dev-query')
  await expect(page.locator('.domain-card').first()).toContainText('$12.00')
  await expect(
    page.getByRole('dialog', { name: 'Page unavailable' }),
  ).toHaveCount(0)
  expect(errors).toEqual([])
})
