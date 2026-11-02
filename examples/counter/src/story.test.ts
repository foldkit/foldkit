import { Effect } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock, Message, Model } from './application'

const initialModel = Model.make({ count: 0 })

describe('update', () => {
  test('ClickedIncrement adds one to the count', () => {
    return Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ClickedIncrement()),
        Command.expectNone(),
        model(model => {
          expect(model.count).toBe(1)
        }),
      ),
    )
  })

  test('ClickedDecrement subtracts one from the count', () => {
    return Effect.runPromise(
      story(
        ApplicationBlock,
        given({ count: 5 }),
        message(Message.ClickedDecrement()),
        model(model => {
          expect(model.count).toBe(4)
        }),
      ),
    )
  })

  test('ClickedDecrement past zero produces a negative count', () => {
    return Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ClickedDecrement()),
        model(model => {
          expect(model.count).toBe(-1)
        }),
      ),
    )
  })

  test('ClickedReset sets the count back to zero', () => {
    return Effect.runPromise(
      story(
        ApplicationBlock,
        given({ count: 99 }),
        message(Message.ClickedReset()),
        model(model => {
          expect(model.count).toBe(0)
        }),
      ),
    )
  })

  test('successive Messages accumulate as expected', () => {
    return Effect.runPromise(
      story(
        ApplicationBlock,
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
      ),
    )
  })
})
