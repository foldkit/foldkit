import { given, message, model, steps, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ApplicationLive, Message } from './resetCounter'

const givenIncremented = steps(
  given({ count: 0 }),
  message(Message.ClickedIncrement()),
)

it.effect('increments again', () =>
  story(
    ApplicationLive,
    givenIncremented,
    message(Message.ClickedIncrement()),
    model(model => {
      expect(model.count).toBe(2)
    }),
  ),
)

it.effect('decrements from the shared setup', () =>
  story(
    ApplicationLive,
    givenIncremented,
    message(Message.ClickedDecrement()),
    model(model => {
      expect(model.count).toBe(0)
    }),
  ),
)
