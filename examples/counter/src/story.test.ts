import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, type Model, update } from './main'

const initialModel: Model = { count: 0 }

describe('update', () => {
  test('ClickedIncrement adds one to the count', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedIncrement()),
      Command.expectNone(),
      model(model => {
        expect(model.count).toBe(1)
      }),
    )
  })

  test('ClickedDecrement subtracts one from the count', () => {
    story(
      update,
      given({ count: 5 }),
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(4)
      }),
    )
  })

  test('ClickedDecrement past zero produces a negative count', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(-1)
      }),
    )
  })

  test('ClickedReset sets the count back to zero', () => {
    story(
      update,
      given({ count: 99 }),
      message(Message.ClickedReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate as expected', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedIncrement()),
      message(Message.ClickedIncrement()),
      message(Message.ClickedIncrement()),
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(2)
      }),
      message(Message.ClickedReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    )
  })
})
