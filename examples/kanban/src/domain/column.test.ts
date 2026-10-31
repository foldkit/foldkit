import { generateKeyBetween } from 'fractional-indexing'

import { describe, expect, it } from '@effect/vitest'

import * as Column from './column'

describe('reorder', () => {
  const k1 = generateKeyBetween(null, null)
  const k2 = generateKeyBetween(k1, null)
  const k3 = generateKeyBetween(k2, null)

  const columns = [
    {
      id: 'a',
      name: 'A',
      cards: [
        { id: '1', title: '1', description: '', sortKey: k1 },
        { id: '2', title: '2', description: '', sortKey: k2 },
        { id: '3', title: '3', description: '', sortKey: k3 },
      ],
    },
    {
      id: 'b',
      name: 'B',
      cards: [{ id: '4', title: '4', description: '', sortKey: k1 }],
    },
  ]

  it('reorders within column', () => {
    const result = Column.reorder(columns, '1', 'a', 'a', 2)
    const cardIds = result
      .find(column => column.id === 'a')
      ?.cards.map(card => card.id)
    expect(cardIds).toStrictEqual(['2', '3', '1'])
  })

  it('moves card to a different column', () => {
    const result = Column.reorder(columns, '1', 'a', 'b', 0)
    const aIds = result
      .find(column => column.id === 'a')
      ?.cards.map(card => card.id)
    const bIds = result
      .find(column => column.id === 'b')
      ?.cards.map(card => card.id)
    expect(aIds).toStrictEqual(['2', '3'])
    expect(bIds).toStrictEqual(['1', '4'])
  })

  it('moves card to end of another column', () => {
    const result = Column.reorder(columns, '1', 'a', 'b', 1)
    const bIds = result
      .find(column => column.id === 'b')
      ?.cards.map(card => card.id)
    expect(bIds).toStrictEqual(['4', '1'])
  })

  it('assigns valid sortKeys after reorder', () => {
    const result = Column.reorder(columns, '3', 'a', 'a', 0)
    const cards = result.find(column => column.id === 'a')?.cards
    const sortKeys = cards?.map(card => card.sortKey) ?? []
    const isSorted = sortKeys.every(
      (key, index) => index === 0 || key > sortKeys[index - 1]!,
    )
    expect(isSorted).toBe(true)
  })
})
