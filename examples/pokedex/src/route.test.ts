import { expect, test } from 'vitest'

import { urlOrThrow } from './main.fixture'
import { type PokedexFields, pokedexRouter, urlToPokedexFields } from './route'

const parse = (path: string): PokedexFields =>
  urlToPokedexFields(urlOrThrow(`http://localhost${path}`))

test('default state prints the bare root path', () => {
  expect(
    pokedexRouter({
      search: '',
      region: 'All',
      pageIndex: 0,
      expandedNames: [],
    }),
  ).toBe('/')
})

test('every field survives a print and parse round trip', () => {
  const fields: PokedexFields = {
    search: '#25 mr mime',
    region: 'Hoenn',
    pageIndex: 3,
    expandedNames: ['mr-mime', 'pikachu'],
  }
  const path = pokedexRouter(fields)

  expect(path).toBe(
    '/?q=%2325+mr+mime&region=Hoenn&page=4&expanded=mr-mime%2Cpikachu',
  )
  expect(parse(path)).toEqual(fields)
})

test('invalid query values fall back to defaults without losing valid ones', () => {
  expect(
    parse('/?q=pika&region=Sinnoh&page=0&expanded=,pikachu,,pikachu'),
  ).toEqual({
    search: 'pika',
    region: 'All',
    pageIndex: 0,
    expandedNames: ['pikachu'],
  })
  expect(parse('/?page=2.5').pageIndex).toBe(0)
})

test('an unknown path falls back to the default state', () => {
  expect(parse('/missing?q=pika')).toEqual({
    search: '',
    region: 'All',
    pageIndex: 0,
    expandedNames: [],
  })
})
