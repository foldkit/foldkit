import { given, message, model, steps, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, layer } from './counter'

const increment = steps(message(Message.ClickedIncrement()))

it.effect('increments again', () =>
  story(
    { block: ApplicationBlock, layer },
    given({ count: 0 }),
    increment,
    message(Message.ClickedIncrement()),
    model(model => {
      expect(model.count).toBe(2)
    }),
  ),
)

it.effect('decrements from the shared setup', () =>
  story(
    { block: ApplicationBlock, layer },
    given({ count: 0 }),
    increment,
    message(Message.ClickedDecrement()),
    model(model => {
      expect(model.count).toBe(0)
    }),
  ),
)
