import { expect, test } from '@playwright/test'

import * as Page from '../page'

test.describe('weather example', () => {
  test('loads cleanly', async ({ page }) => {
    await Page.assertLoadedCleanly(page)
  })

  test('renders weather for a zip code with mocked APIs', async ({ page }) => {
    await page.route('**/geocoding-api.open-meteo.com/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              name: 'Test City',
              latitude: 33.99,
              longitude: -118.4,
              admin1: 'California',
            },
          ],
        }),
      }),
    )
    await page.route('**/api.open-meteo.com/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current: {
            temperature_2m: 72,
            relative_humidity_2m: 50,
            wind_speed_10m: 5,
            weather_code: 0,
          },
        }),
      }),
    )

    await page.goto('/')
    await page.getByPlaceholder('Enter a zip code').fill('90210')
    await page.getByRole('button', { name: 'Get Weather' }).click()
    await expect(page.getByText('72°F')).toBeVisible()
    await expect(page.getByText('Clear sky')).toBeVisible()
    await expect(page.getByText('Test City, California')).toBeVisible()
  })
})
