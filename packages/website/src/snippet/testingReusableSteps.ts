import { Effect } from 'effect'
import { given, message, model, steps, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { ApplicationBlock, Message } from './counter'

const increment = steps(message(Message.ClickedIncrement()))

test('increments again', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given({ count: 0 }),
      increment,
      message(Message.ClickedIncrement()),
      model(model => {
        expect(model.count).toBe(2)
      }),
    ),
  )
})

test('decrements from the shared setup', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given({ count: 0 }),
      increment,
      message(Message.ClickedDecrement()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )
})
