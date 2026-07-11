import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('checkout-machine example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('routes the hardcover order through delivery', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Continue to delivery' }).click()
    await expect(
      page.getByRole('heading', { name: 'Delivery details' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Back to bag' }).click()
    await expect(
      page.getByRole('heading', { name: 'Your order' }),
    ).toBeVisible()
  })

  test('confirms a digital order without a delivery step', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: 'E-book' }).click()
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await expect(
      page.getByRole('heading', { name: 'Payment', exact: true }),
    ).toBeVisible()

    await page.getByRole('checkbox', { name: 'Mastercard •••• 4242' }).click()
    await page.getByRole('button', { name: 'Review order' }).click()
    await page.getByRole('checkbox', { name: 'Accept terms of sale' }).click()
    await page.getByRole('button', { name: 'Place order · $30.31' }).click()

    await expect(
      page.getByRole('heading', { name: 'Processing your order' }),
    ).toBeVisible()
    await expect(page.getByText('Order DIGI-1001 confirmed')).toBeVisible()
  })

  test('ignores place order until the review guard passes', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: 'E-book' }).click()
    await page.getByRole('button', { name: 'Continue to payment' }).click()
    await page.getByRole('checkbox', { name: 'Mastercard •••• 4242' }).click()
    await page.getByRole('button', { name: 'Review order' }).click()

    await expect(
      page.getByRole('button', { name: 'Place order · $30.31' }),
    ).toBeDisabled()
    await page.getByRole('checkbox', { name: 'Accept terms of sale' }).click()
    await expect(
      page.getByRole('button', { name: 'Place order · $30.31' }),
    ).toBeEnabled()

    await page.getByLabel('Promo code').fill('reader10')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByText('READER10 applied · 10% off')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Place order · $27.28' }),
    ).toBeVisible()

    await page.getByLabel('Promo code').fill('bogus')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByText("That code isn't recognized.")).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Place order · $30.31' }),
    ).toBeVisible()
  })
})
