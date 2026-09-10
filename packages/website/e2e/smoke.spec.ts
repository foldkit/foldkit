import { expect, test } from '@playwright/test'

test('renders the experimental API reference', async ({ page }) => {
  await page.goto('/api-reference/experimental-machine')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Experimental/Machine' }),
  ).toBeVisible()

  const docsNav = page.getByRole('navigation', { name: 'Documentation' })
  await expect(
    docsNav.getByRole('link', {
      name: 'Experimental/Machine',
      exact: true,
    }),
  ).toBeVisible()
  await docsNav
    .getByRole('link', { name: 'Experimental/Server', exact: true })
    .click()

  await expect(page).toHaveURL(/\/api-reference\/experimental-server$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Experimental/Server' }),
  ).toBeVisible()
})

test('closes the hover-intent menu without navigating', async ({ page }) => {
  await page.goto('/ui/hover-intent', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)

  const trigger = page.locator('#hover-intent-menu-trigger')
  const panel = page.locator('#hover-intent-menu-panel')

  await trigger.focus()
  await expect(panel).toBeVisible()

  await panel.getByRole('button', { name: 'Edit' }).click()
  await expect(panel).toBeHidden()
  await expect(page).toHaveURL(/\/ui\/hover-intent$/)
})

test('names the mobile menu and moves focus into it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/ui/dialog')

  const trigger = page.getByRole('button', { name: 'Toggle menu' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Navigation menu' })
  await expect(dialog).toHaveAccessibleDescription(
    'Browse Foldkit documentation',
  )
  await expect(
    dialog.getByRole('navigation', { name: 'Documentation' }),
  ).toBeFocused()

  await dialog.getByRole('button', { name: 'Close menu' }).click()
  await expect(trigger).toBeFocused()
})

test('selects an item from the combobox', async ({ page }) => {
  await page.goto('/')

  await page
    .getByRole('region', { name: 'Hero' })
    .getByRole('link', { name: 'Learn the architecture' })
    .click()
  await expect(page).toHaveURL(/\/core\/architecture$/)

  const docsNav = page.getByRole('navigation', { name: 'Documentation' })

  await docsNav.getByRole('button', { name: 'Foldkit UI' }).click()
  await docsNav.getByRole('link', { name: 'Combobox', exact: true }).click()
  await expect(page).toHaveURL(/\/ui\/combobox$/)

  const singleSelect = page.getByRole('region', { name: 'Single-Select' })
  const combobox = singleSelect.getByRole('combobox')
  await expect(
    singleSelect.getByRole('button', { name: 'Show suggestions' }),
  ).toBeVisible()

  await combobox.click()
  await combobox.pressSequentially('Oxf')
  await page.getByRole('option', { name: 'Oxford' }).click()
  await expect(combobox).toHaveValue('Oxford')
})

test('opens search from the landing page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)

  const dialog = page.locator('#search-dialog')

  await page.getByRole('button', { name: 'Search documentation' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.keyboard.press('ControlOrMeta+k')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox')).toBeFocused()
})

test('opens search from the landing page below the wide trigger', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-foldkit-build]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Search documentation' }).click()

  const dialog = page.locator('#search-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox')).toBeFocused()
})
