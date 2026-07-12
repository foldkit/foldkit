import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('route transitions example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('a cold load logs an entry into the initial route', async ({ page }) => {
    await page.goto('/gallery')
    await expect(page.getByText('Cold load').first()).toBeVisible()
    await expect(page.getByText('Entered Gallery').first()).toBeVisible()
  })

  test('entering the gallery loads the catalog', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Gallery', exact: true }).click()
    await expect(page.getByText('Entered Gallery').first()).toBeVisible()
    await expect(page.getByText('Exited Home').first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Dawn Over the Harbor/ }),
    ).toBeVisible()
  })

  test('flipping paintings logs a stayed transition and refetches', async ({
    page,
  }) => {
    await page.goto('/gallery/1')
    await page.getByRole('link', { name: 'Next' }).click()
    await expect(page).toHaveURL(/\/gallery\/2$/)
    await expect(
      page.getByText('Stayed on Painting: 1 → 2').first(),
    ).toBeVisible()
    await expect(page.getByText('Static in Bloom')).toBeVisible()
  })

  test('leaving the studio saves the draft', async ({ page }) => {
    await page.goto('/studio')
    await page.getByRole('textbox').fill('half-finished thought')
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(page.getByText('Exited Studio').first()).toBeVisible()
    await page.getByRole('link', { name: 'Studio', exact: true }).click()
    await expect(page.getByText('Last saved draft')).toBeVisible()
    await expect(page.getByText('half-finished thought')).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveValue('half-finished thought')
  })
})
