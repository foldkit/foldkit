import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('api-cache-query example', () => {
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
    await expect(page.getByText('Loading post…')).toHaveCount(0)
    await expect(page.getByText('Fetched at')).toBeVisible()

    await page.getByRole('button', { name: 'Back to posts' }).click()
    await page.getByRole('tab', { name: 'Stats' }).click()
    await expect(page.getByText('Active users')).toBeVisible()
    await expect(page.getByText('Updated at')).toBeVisible()
  })

  test('an unavailable post can be retried', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'This Post Is Unavailable' }).click()
    const unavailableMessage = page.getByText(
      'This post is unavailable. You can try again.',
    )
    await expect(unavailableMessage).toBeVisible()

    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('Loading post…')).toBeVisible()
    await expect(unavailableMessage).toBeHidden()
    await expect(unavailableMessage).toBeVisible()
  })
})
