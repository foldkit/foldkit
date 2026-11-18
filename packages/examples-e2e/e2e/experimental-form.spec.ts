import { expect, test } from '@playwright/test'

import * as Page from '../page'

test('loads cleanly', async ({ page }) => {
  await Page.assertLoadedCleanly(page)
})

test('validates, submits, and restores edit defaults', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(
    page.getByText('Enter an email address', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Registration email').fill('person@example.com')
  await page.getByLabel('Your name').fill('Person')
  await page.getByLabel('Your age').fill('30')
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Registration' })
      .getByText('Saved', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Registered: person@example.com', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Profile email').fill('taken@example.com')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(
    page.getByText(
      'Profile profile-1 cannot use an email that is already registered',
      { exact: true },
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset profile', exact: true }).click()
  await expect(page.getByLabel('Profile email')).toHaveValue(
    'reader@example.com',
  )
})

test('profile topics support checkbox clicks and keyboard activation and restore defaults', async ({
  page,
}) => {
  await page.goto('/')
  const effectCheckbox = page.getByRole('checkbox', {
    name: 'Effect',
    exact: true,
  })
  const foldkitCheckbox = page.getByRole('checkbox', {
    name: 'Foldkit',
    exact: true,
  })
  await effectCheckbox.click()
  await foldkitCheckbox.focus()
  await foldkitCheckbox.press('Space')
  await expect(effectCheckbox).toBeChecked()
  await expect(foldkitCheckbox).toBeChecked()
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Profile' })
      .getByText('Saved', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset profile', exact: true }).click()
  await expect(effectCheckbox).not.toBeChecked()
  await expect(foldkitCheckbox).not.toBeChecked()
})

test('continues a single submit after async validation and blocks rejected email', async ({
  page,
}) => {
  await page.goto('/')
  const registrationRegion = page.getByRole('region', { name: 'Registration' })
  await page.getByLabel('Registration email').fill('blocked@example.com')
  await page.getByLabel('Your name').fill('Person')
  await page.getByLabel('Your age').fill('30')
  await registrationRegion
    .getByRole('button', { name: 'Register', exact: true })
    .click()
  await expect(
    registrationRegion.getByText('This email cannot be used', { exact: true }),
  ).toBeVisible()
  await expect(
    registrationRegion.getByText('Saved', { exact: true }),
  ).not.toBeVisible()
  await page.getByLabel('Registration email').fill('person@example.com')
  await registrationRegion
    .getByRole('button', { name: 'Register', exact: true })
    .click()
  await expect(
    registrationRegion.getByText('Saved', { exact: true }),
  ).toBeVisible()
})
