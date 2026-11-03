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
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Registration' })
      .getByText('Saved', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Profile email').fill('taken@example.com')
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(
    page.getByText('This email is already registered', { exact: true }),
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
  const effect = page.getByRole('checkbox', { name: 'Effect', exact: true })
  const foldkit = page.getByRole('checkbox', { name: 'Foldkit', exact: true })
  await effect.click()
  await foldkit.focus()
  await foldkit.press('Space')
  await expect(effect).toBeChecked()
  await expect(foldkit).toBeChecked()
  await page.getByRole('button', { name: 'Save profile', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Profile' })
      .getByText('Saved', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset profile', exact: true }).click()
  await expect(effect).not.toBeChecked()
  await expect(foldkit).not.toBeChecked()
})

test('continues a single submit after async validation and blocks rejected email', async ({
  page,
}) => {
  await page.goto('/')
  const registration = page.getByRole('region', { name: 'Registration' })
  await page.getByLabel('Registration email').fill('blocked@example.com')
  await page.getByLabel('Your name').fill('Person')
  await registration
    .getByRole('button', { name: 'Register', exact: true })
    .click()
  await expect(
    registration.getByText('This email cannot be used', { exact: true }),
  ).toBeVisible()
  await expect(
    registration.getByText('Saved', { exact: true }),
  ).not.toBeVisible()
  await page.getByLabel('Registration email').fill('person@example.com')
  await registration
    .getByRole('button', { name: 'Register', exact: true })
    .click()
  await expect(registration.getByText('Saved', { exact: true })).toBeVisible()
})
