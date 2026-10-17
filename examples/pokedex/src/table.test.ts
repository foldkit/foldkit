import { expect, test } from 'vitest'

import { matchesSearch } from './table'

const pikachu = { id: 25, name: 'pikachu' }

test('a search matches a name substring regardless of case', () => {
  expect(matchesSearch(pikachu, 'pika')).toBe(true)
  expect(matchesSearch(pikachu, ' KACH ')).toBe(true)
  expect(matchesSearch(pikachu, 'raichu')).toBe(false)
})

test('a search matches the exact Pokédex number with or without padding and #', () => {
  expect(matchesSearch(pikachu, '25')).toBe(true)
  expect(matchesSearch(pikachu, '025')).toBe(true)
  expect(matchesSearch(pikachu, '#25')).toBe(true)
  expect(matchesSearch(pikachu, '#025')).toBe(true)
  expect(matchesSearch(pikachu, '2')).toBe(false)
  expect(matchesSearch(pikachu, '250')).toBe(false)
  expect(matchesSearch(pikachu, '#')).toBe(false)
})
