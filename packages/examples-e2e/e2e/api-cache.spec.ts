import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('api-cache example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('fetches posts, caches details, and renders stats', async ({ page }) => {
    await page.goto('/')

    const firstPost = page.getByRole('button', {
      name: 'The Model Is the Cache',
    })
    await expect(firstPost).toBeVisible()

    await firstPost.click()
    await expect(page.getByText('Fetched at')).toBeVisible()

    await page.getByRole('button', { name: 'Back to posts' }).click()
    await expect(page.getByText('Cached')).toBeVisible()

    await firstPost.click()
    await expect(page.getByText('Fetched at')).toBeVisible()

    await page.getByRole('button', { name: 'Back to posts' }).click()
    await page.getByRole('tab', { name: 'Stats' }).click()
    await expect(page.getByText('Active users')).toBeVisible()
    await expect(page.getByText('Updated at')).toBeVisible()
  })

  test('the flaky post fails on the first fetch and succeeds on retry', async ({
    page,
  }) => {
    await page.goto('/')

    await page
      .getByRole('button', { name: 'This Post Fails Every Other Fetch' })
      .click()
    await expect(page.getByText('The connection dropped.')).toBeVisible()

    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('You made it.')).toBeVisible()
  })
})
