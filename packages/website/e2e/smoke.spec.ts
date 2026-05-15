import { expect, test } from '@playwright/test'

test('selects an item from the combobox', async ({ page }) => {
  await page.goto('/')

  await page
    .getByRole('region', { name: 'Hero' })
    .getByRole('link', { name: 'Dive In' })
    .click()
  await expect(page).toHaveURL(/\/core\/architecture$/)

  const docsNav = page.getByRole('navigation', { name: 'Documentation' })

  await docsNav.getByRole('button', { name: 'Foldkit UI' }).click()
  await docsNav.getByRole('link', { name: 'Combobox', exact: true }).click()
  await expect(page).toHaveURL(/\/ui\/combobox$/)

  const combobox = page
    .getByRole('region', { name: 'Single-Select' })
    .getByRole('combobox')

  await combobox.click()
  await combobox.pressSequentially('Oxf')
  await page.getByRole('option', { name: 'Oxford' }).click()
  await expect(combobox).toHaveValue('Oxford')
})
