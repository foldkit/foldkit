import { type Page as PlaywrightPage, expect, test } from '@playwright/test'

import * as Page from '../page'

const mockTelemetryApis = async (page: PlaywrightPage) => {
  await page.route('**/repos/foldkit/foldkit/contributors**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { login: 'devin', contributions: 42 },
        { login: 'maya', contributions: 21 },
      ]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/issues**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{}, { pull_request: {} }]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/pulls**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1 }]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/releases**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          tag_name: 'v0.115.0',
          published_at: '2026-06-20T12:00:00Z',
          prerelease: false,
          draft: false,
        },
      ]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/stargazers**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ starred_at: '2026-06-15T12:00:00Z' }]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/stats/commit_activity**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ week: 1781481600, total: 5 }]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit/stats/code_frequency**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([[1781481600, 120, -35]]),
    }),
  )
  await page.route('**/repos/foldkit/foldkit', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stargazers_count: 342,
        forks_count: 18,
        watchers_count: 342,
        open_issues_count: 15,
        pushed_at: '2026-06-21T19:20:00Z',
        default_branch: 'main',
      }),
    }),
  )
  await page.route('**/api.npmjs.org/downloads/range/last-year/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        downloads: [
          { day: '2026-06-01', downloads: 10 },
          { day: '2026-06-08', downloads: 20 },
          { day: '2026-06-15', downloads: 30 },
        ],
      }),
    }),
  )
  await page.route('**/registry.npmjs.org/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'foldkit',
        time: {
          '0.115.0': '2026-06-20T12:00:00Z',
        },
        versions: {
          '0.115.0': {
            dependencies: {},
            peerDependencies: {
              effect: '^4.0.0',
            },
          },
        },
        'dist-tags': {
          latest: '0.115.0',
        },
      }),
    }),
  )
}

test.describe('charting example', () => {
  test('loads cleanly', async ({ page }) => {
    await mockTelemetryApis(page)
    await Page.assertLoadedCleanly(page)
  })

  test('switches chart modes', async ({ page }) => {
    await mockTelemetryApis(page)
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Foldkit Adoption Observatory' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Velocity' }).click()
    await expect(
      page.getByRole('button', { name: 'Velocity' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
