import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('embedding example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('the host mirrors counts the widget emits through its outbound port', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#host-count')).not.toHaveText('none yet', {
      timeout: 5000,
    })
  })

  test('the host pushes a step to the widget through its inbound port', async ({
    page,
  }) => {
    await page.goto('/')
    await page.locator('#step-range').fill('10')
    await expect(page.getByText('Ticking up by 10 every second')).toBeVisible()
  })

  test('unmounting the widget disposes the runtime and freezes the host mirror', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.locator('#host-count')).not.toHaveText('none yet', {
      timeout: 5000,
    })

    await page.getByRole('button', { name: 'Unmount widget' }).click()
    await expect(page.getByText('Foldkit widget')).toBeHidden()
    await expect(page.locator('#widget-slot')).toBeEmpty()

    const frozenCount = await page.locator('#host-count').textContent()
    await page.waitForTimeout(1500)
    await expect(page.locator('#host-count')).toHaveText(frozenCount ?? '')
  })

  test('remounting embeds a fresh widget into the restored container', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Unmount widget' }).click()
    await expect(page.locator('#widget-slot')).toBeEmpty()

    await page.getByRole('button', { name: 'Mount widget' }).click()
    await expect(page.getByText('Foldkit widget')).toBeVisible()
  })
})
