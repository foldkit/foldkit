import { Array, Option } from 'effect'
import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, init, update } from './main'

const initialModel = init().model

describe('update', () => {
  test('IncrementedTick increments tick without changing counter', () => {
    story(
      update,
      given(initialModel),
      message(Message.IncrementedTick()),
      model(model => {
        expect(model.tick).toBe(1)
        expect(model.counter).toBe(0)
      }),
    )
  })

  test('IncrementedCounter increments counter without changing tick', () => {
    story(
      update,
      given(initialModel),
      message(Message.IncrementedCounter()),
      model(model => {
        expect(model.tick).toBe(0)
        expect(model.counter).toBe(1)
      }),
    )
  })

  test('IncrementedItem increments only the matching row', () => {
    story(
      update,
      given(initialModel),
      message(Message.IncrementedItem({ id: 'item-2' })),
      model(model => {
        const maybeItem1 = Array.findFirst(
          model.items,
          item => item.id === 'item-1',
        )
        const maybeItem2 = Array.findFirst(
          model.items,
          item => item.id === 'item-2',
        )

        expect(Option.getOrThrow(maybeItem1).value).toBe(0)
        expect(Option.getOrThrow(maybeItem2).value).toBe(1)
      }),
    )
  })

  test('AddedItem appends a new row', () => {
    story(
      update,
      given(initialModel),
      message(Message.AddedItem()),
      model(model => {
        expect(model.items).toHaveLength(6)
        expect(Option.getOrThrow(Array.get(model.items, 5)).id).toBe('item-6')
      }),
    )
  })

  test('ToggledMemoization flips the memoization flag', () => {
    story(
      update,
      given(initialModel),
      message(Message.ToggledMemoization({ isMemoized: false })),
      model(model => {
        expect(model.isMemoized).toBe(false)
      }),
    )
  })
})
