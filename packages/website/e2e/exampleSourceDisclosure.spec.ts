import { expect, test } from '@playwright/test'

test('keeps example source code expanded when switching files', async ({
  page,
}) => {
  await page.goto('/example-apps/ssr')
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)

  const sourceFiles = page.getByRole('tablist', { name: 'Source files' })
  const mainFile = sourceFiles.getByRole('tab', { name: /main\.ts$/ })
  const serverFile = sourceFiles.getByRole('tab', {
    name: /entry\.server\.ts$/,
  })
  const codePanel = page.locator('.code-embed-panel')

  await expect(mainFile).toHaveAttribute('aria-selected', 'true')
  await codePanel.getByRole('button', { name: 'Show code' }).click()
  await expect(
    codePanel.getByRole('button', { name: 'Hide code' }),
  ).toBeVisible()

  await serverFile.click()
  await expect(
    codePanel.getByRole('button', { name: 'Hide code' }),
  ).toBeVisible()

  await codePanel.getByRole('button', { name: 'Hide code' }).click()
  await mainFile.click()
  await expect(
    codePanel.getByRole('button', { name: 'Show code' }),
  ).toBeVisible()
})
