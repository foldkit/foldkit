import { Command, given, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ApplicationLive, Message, WaitBeforeReset } from './resetCounter'

it.effect('accepts another click while the reset is pending', () =>
  story(
    ApplicationLive,
    given({ count: 5 }),
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
  ),
)
