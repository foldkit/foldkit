import { Command, given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message } from './application'

describe('update', () => {
  it.effect('ClickedIncrement adds one to the count', () =>
    story(
      ApplicationLive,
      message(Message.ClickedIncrement()),
      Command.expectNone(),
      model(model => {
        expect(model.count).toBe(1)
      }),
    ),
  )

  it.effect('ClickedDecrement subtracts one from the count', () =>
    story(
      ApplicationLive,
      given({ count: 5 }),
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(4)
      }),
    ),
  )

  it.effect('ClickedDecrement past zero produces a negative count', () =>
    story(
      ApplicationLive,
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(-1)
      }),
    ),
  )

  it.effect('ClickedReset sets the count back to zero', () =>
    story(
      ApplicationLive,
      given({ count: 99 }),
      message(Message.ClickedReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )

  it.effect('successive Messages accumulate as expected', () =>
    story(
      ApplicationLive,
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
