import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Message, Model, WaitBeforeReset, update } from './counterCommands'

test('accepts another click while the reset is pending', () => {
  story(
    update,
    given(Model.make({ count: 5 })),
    message(Message.ClickedResetAfterDelay()),
    Command.expectExact(WaitBeforeReset),
    message(Message.ClickedIncrement()),
    model(model => {
      expect(model.count).toBe(6)
    }),
    Command.expectExact(WaitBeforeReset),
    Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
    model(model => {
      expect(model.count).toBe(0)
    }),
  )
})
