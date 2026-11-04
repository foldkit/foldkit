import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  Model,
  WaitBeforeReset,
  layer,
} from './counterCommands'

it.effect('accepts another click while the reset is pending', () =>
  story(
    { block: ApplicationBlock, layer },
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
  ),
)
