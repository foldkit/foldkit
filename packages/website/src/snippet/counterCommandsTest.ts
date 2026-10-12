import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Message, Model, WaitBeforeReset, update } from './main'

test('resets the count after waiting', () => {
  story(
    update,
    given(Model.make({ count: 5 })),
    message(Message.ClickedResetAfterDelay()),
    Command.expectExact(WaitBeforeReset),
    Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
    model(model => {
      expect(model.count).toBe(0)
    }),
  )
})
