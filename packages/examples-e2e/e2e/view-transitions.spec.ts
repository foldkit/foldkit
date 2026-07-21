import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('view-transitions example', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('navigates from a gallery card to the artwork detail and back', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Dawn Chorus' }).click()
    await expect(page).toHaveURL(/\/artwork\/1$/)
    await expect(page.getByText('A warm wash of first light')).toBeVisible()
    await page.getByRole('link', { name: 'Back to gallery' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Deep Water' })).toBeVisible()
  })

  test('filtering narrows the gallery without navigating', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('Filter by title').fill('graphite')
    await expect(page.getByRole('link', { name: 'Graphite' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dawn Chorus' })).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
  })

  test('route changes run inside startViewTransition and keystrokes do not', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalStartViewTransition =
        document.startViewTransition.bind(document)
      document.startViewTransition = callbackOptions => {
        const currentCount = Number(
          document.documentElement.dataset['viewTransitionCount'] ?? '0',
        )
        document.documentElement.dataset['viewTransitionCount'] = String(
          currentCount + 1,
        )
        return originalStartViewTransition(callbackOptions)
      }
    })

    const transitionCount = (): Promise<number> =>
      page.evaluate(() =>
        Number(document.documentElement.dataset['viewTransitionCount'] ?? '0'),
      )

    await page.goto('/')
    expect(await transitionCount()).toBe(0)

    await page.getByRole('link', { name: 'Deep Water' }).click()
    await expect(page).toHaveURL(/\/artwork\/2$/)
    await expect.poll(transitionCount).toBe(1)

    await page.getByRole('link', { name: 'Back to gallery' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect.poll(transitionCount).toBe(2)

    await page.getByPlaceholder('Filter by title').fill('moss')
    await expect(page.getByRole('link', { name: 'Moss Study' })).toBeVisible()
    expect(await transitionCount()).toBe(2)
  })
})
