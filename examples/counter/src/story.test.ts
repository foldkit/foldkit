import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, Model, layer } from './block'

const initialModel = Model.make({ count: 0 })

describe('update', () => {
  it.effect('ClickedIncrement adds one to the count', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedIncrement()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.count).toBe(1)
      }),
    ),
  )

  it.effect('ClickedDecrement subtracts one from the count', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given({ count: 5 }),
      Story.message(Message.ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(4)
      }),
    ),
  )

  it.effect('ClickedDecrement past zero produces a negative count', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(-1)
      }),
    ),
  )

  it.effect('ClickedReset sets the count back to zero', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given({ count: 99 }),
      Story.message(Message.ClickedReset()),
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )

  it.effect('successive Messages accumulate as expected', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedIncrement()),
      Story.message(Message.ClickedIncrement()),
      Story.message(Message.ClickedIncrement()),
      Story.message(Message.ClickedDecrement()),
      Story.model(model => {
        expect(model.count).toBe(2)
      }),
      Story.message(Message.ClickedReset()),
      Story.model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )
})
