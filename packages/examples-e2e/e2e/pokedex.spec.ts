import { type Page as PlaywrightPage, expect, test } from '@playwright/test'

import * as Page from '../page'

const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const listEntry = (id: number, name: string) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
})

const namedResource = (name: string) => ({ name, url: '' })

const mockPokeApi = async (page: PlaywrightPage) => {
  await page.route(/raw\.githubusercontent\.com\//, route =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(TRANSPARENT_PNG_BASE64, 'base64'),
    }),
  )
  await page.route(/pokeapi\.co\/api\/v2\/pokemon\?/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        count: 1302,
        next: null,
        previous: null,
        results: [
          listEntry(1, 'bulbasaur'),
          listEntry(2, 'ivysaur'),
          listEntry(3, 'venusaur'),
          listEntry(4, 'charmander'),
          listEntry(25, 'pikachu'),
        ],
      }),
    }),
  )
  await page.route(/pokeapi\.co\/api\/v2\/pokemon\/bulbasaur$/, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        types: [
          { slot: 1, type: namedResource('grass') },
          { slot: 2, type: namedResource('poison') },
        ],
        stats: [
          { base_stat: 45, effort: 0, stat: namedResource('hp') },
          { base_stat: 49, effort: 0, stat: namedResource('attack') },
          { base_stat: 49, effort: 0, stat: namedResource('defense') },
          { base_stat: 65, effort: 1, stat: namedResource('special-attack') },
          { base_stat: 65, effort: 0, stat: namedResource('special-defense') },
          { base_stat: 45, effort: 0, stat: namedResource('speed') },
        ],
        abilities: [
          { ability: namedResource('overgrow'), is_hidden: false, slot: 1 },
          { ability: namedResource('chlorophyll'), is_hidden: true, slot: 3 },
        ],
        sprites: {
          other: {
            'official-artwork': {
              front_default:
                'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
            },
          },
        },
      }),
    }),
  )
}

test.describe('pokedex example', () => {
  test('loads cleanly', async ({ page }) => {
    await mockPokeApi(page)
    await Page.assertLoadedCleanly(page, {
      readyLocator: page.getByText('5 Pokémon'),
    })
  })

  test('focuses the search with Ctrl+K and narrows the table', async ({
    page,
  }) => {
    await mockPokeApi(page)
    await page.goto('/')

    await expect(page.getByText('5 Pokémon')).toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Search Pokémon' })
    await page.keyboard.press('Control+K')
    await expect(search).toBeFocused()
    await page.keyboard.type('saur')

    await expect(search).toHaveValue('saur')

    await expect(page.getByText('3 Pokémon')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ivysaur' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pikachu' })).toHaveCount(0)
  })

  test('expands a row to show its base stats', async ({ page }) => {
    await mockPokeApi(page)
    await page.goto('/')

    const bulbasaur = page.getByRole('button', { name: 'Bulbasaur' })
    await bulbasaur.click()

    await expect(bulbasaur).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('meter', { name: 'Attack' })).toHaveAttribute(
      'aria-valuenow',
      '49',
    )
    await expect(page.getByText('Overgrow, Chlorophyll')).toBeVisible()
  })

  test('restores filters and expanded rows from the URL', async ({ page }) => {
    await mockPokeApi(page)
    await page.goto('/?q=saur&expanded=bulbasaur')

    const search = page.getByRole('searchbox', { name: 'Search Pokémon' })
    await expect(search).toHaveValue('saur')
    await expect(page.getByText('3 Pokémon')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Bulbasaur' }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText('Overgrow, Chlorophyll')).toBeVisible()

    await page.getByRole('radio', { name: 'Kanto' }).click()
    await expect(page).toHaveURL(/region=Kanto/)

    await page.goBack()
    await expect(page).not.toHaveURL(/region=Kanto/)
    await expect(page.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(search).toHaveValue('saur')
  })
})
