import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('interrupting-commands example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('an upload runs to completion', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await expect(page.getByText('vacation-photos.zip')).toBeVisible()
    await expect(page.getByText('Uploading').first()).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible({ timeout: 15_000 })
  })

  test('an upload can be cancelled and restarted', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await page.getByRole('button', { name: 'Cancel upload 0' }).click()
    await expect(page.getByText('Cancelled')).toBeVisible()
    await page.getByRole('button', { name: 'Restart upload 0' }).click()
    await expect(page.getByText('Uploading').first()).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible({ timeout: 15_000 })
  })

  test('cancelling one upload leaves the other running', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await page.getByRole('button', { name: 'Cancel upload 0' }).click()
    await expect(page.getByText('Cancelled')).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('demo-recording.mp4')).toBeVisible()
  })

  test('cancel all stops every running upload', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await page.getByRole('button', { name: 'Upload a file' }).click()
    await page.getByRole('button', { name: 'Cancel all' }).click()
    await expect(page.getByText('Cancelled')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Cancel all' })).toBeHidden()
  })
})
