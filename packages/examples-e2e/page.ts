import { type Page, expect } from '@playwright/test'

const collectErrors = (page: Page): Array<string> => {
  const errors: Array<string> = []
  page.on('pageerror', error => {
    errors.push(error.message)
  })
  return errors
}

export const assertLoadedCleanly = async (page: Page): Promise<void> => {
  const errors = collectErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('#root')).toHaveCount(0)
  expect(errors).toEqual([])
}
