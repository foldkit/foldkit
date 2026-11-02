import { Effect } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { ApplicationBlock } from './application'
import { Message, Model, WaitBeforeReset, update } from './application'

test('resets the count after waiting', async () => {
  await Effect.runPromise(
    story(
      ApplicationBlock,
      given(Model.make({ count: 5 })),
      message(Message.ClickedResetAfterDelay()),
      Command.expectExact(WaitBeforeReset),
      Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
      model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )
})
