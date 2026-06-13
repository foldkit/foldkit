import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
  type Model,
  update,
} from './main'

const initialModel: Model = { count: 0 }

describe('update', () => {
  test('ClickedIncrement adds one to the count', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedIncrement()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('ClickedDecrement subtracts one from the count', () => {
    Story.story(
      update,
      Story.with({ count: 5 }),
      Story.message(ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(4)
      }),
    )
  })

  test('ClickedDecrement past zero produces a negative count', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(-1)
      }),
    )
  })

  test('ClickedReset sets the count back to zero', () => {
    Story.story(
      update,
      Story.with({ count: 99 }),
      Story.message(ClickedReset()),
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate as expected', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedIncrement()),
      Story.message(ClickedIncrement()),
      Story.message(ClickedIncrement()),
      Story.message(ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(2)
      }),
      Story.message(ClickedReset()),
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })
})
