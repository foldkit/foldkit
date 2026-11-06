import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, layer } from './counter'

const increment = Story.steps(Story.message(Message.ClickedIncrement()))

it.effect('increments again', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given({ count: 0 }),
    increment,
    Story.message(Message.ClickedIncrement()),
    Story.model(model => {
      expect(model.count).toBe(2)
    }),
  ),
)

it.effect('decrements from the shared setup', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given({ count: 0 }),
    increment,
    Story.message(Message.ClickedDecrement()),
    Story.model(model => {
      expect(model.count).toBe(0)
    }),
  ),
)
