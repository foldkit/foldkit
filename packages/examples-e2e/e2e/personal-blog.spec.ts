import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('personal-blog example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('renders the about prose from markdown', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('human man living in Boston')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'August Health' }),
    ).toBeVisible()
  })

  test('a markdown island counts clicks inside a post', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Posts' }).click()
    await page.getByRole('link', { name: 'Making This Blog' }).click()
    await expect(
      page.getByRole('heading', { name: 'Making This Blog' }),
    ).toBeVisible()

    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText('2', { exact: true })).toBeVisible()
  })

  test('the island count survives navigating away and back', async ({
    page,
  }) => {
    await page.goto('/posts/making-this-blog')
    await page.getByRole('button', { name: '+' }).click()
    await page.getByRole('link', { name: 'About' }).click()
    await expect(page.getByText('human man living in Boston')).toBeVisible()

    await page.goBack()
    await expect(page.getByText('1', { exact: true })).toBeVisible()
  })

  test('renders markdown tables', async ({ page }) => {
    await page.goto('/posts/shooting-film')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByText('Low light, pushed')).toBeVisible()
  })
})
