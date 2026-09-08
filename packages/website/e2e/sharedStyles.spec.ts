import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const readAccentStyle = (locator: Locator) =>
  locator.evaluate(element => {
    const style = getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontWeight: style.fontWeight,
    }
  })

const assertSharedStyles = async (
  page: Page,
  themePreference: 'Light' | 'Dark',
  colors: Readonly<{
    accentBackground: string
    accentForeground: string
    codeBackground: string
    codeForeground: string
  }>,
) => {
  await page.addInitScript(preference => {
    localStorage.setItem('theme-preference', JSON.stringify(preference))
  }, themePreference)

  await page.goto('/')

  const getStartedButton = page
    .locator('header')
    .getByRole('link', { name: 'Get started' })
  await expect(getStartedButton).toHaveCSS(
    'background-color',
    colors.accentBackground,
  )
  await expect(getStartedButton).toHaveCSS('color', colors.accentForeground)
  await expect(getStartedButton).toHaveCSS('font-weight', '400')

  const getStartedStyle = await readAccentStyle(getStartedButton)
  const landingCta = page
    .locator('main')
    .getByRole('link', { name: 'Get started' })
  await expect.poll(() => readAccentStyle(landingCta)).toEqual(getStartedStyle)

  await page.goto('/ui/button')

  const demoButton = page.getByRole('button', { name: 'Click me' })
  await expect.poll(() => readAccentStyle(demoButton)).toEqual(getStartedStyle)

  await page.goto('/core/architecture')

  const diagram = page.locator('pre.code-surface').first()
  await expect(diagram).toHaveCSS('background-color', colors.codeBackground)
  await expect(diagram).toHaveCSS('color', colors.codeForeground)
}

test('keeps shared styles aligned in light mode', async ({ page }) => {
  await assertSharedStyles(page, 'Light', {
    accentBackground: 'rgb(77, 122, 21)',
    accentForeground: 'rgb(255, 255, 255)',
    codeBackground: 'rgb(238, 237, 242)',
    codeForeground: 'rgb(64, 61, 74)',
  })
})

test('keeps shared styles aligned in dark mode', async ({ page }) => {
  await assertSharedStyles(page, 'Dark', {
    accentBackground: 'rgb(130, 181, 54)',
    accentForeground: 'rgb(37, 59, 10)',
    codeBackground: 'rgb(28, 26, 32)',
    codeForeground: 'rgb(224, 222, 230)',
  })
})
