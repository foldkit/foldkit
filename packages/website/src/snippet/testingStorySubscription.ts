import { message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Message, TimerLive } from './timer'

it.effect('counts each tick while running', () =>
  story(
    TimerLive,
    message(Message.ClickedStart()),
    // The tick Stream never runs in a Story. Deliver the Message it produces.
    message(Message.Ticked()),
    message(Message.Ticked()),
    model(model => {
      expect(model.elapsedSeconds).toBe(2)
    }),
  ),
)
