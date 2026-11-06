import { Story } from 'foldkit'
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
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Model.make({ count: 5 })),
    Story.message(Message.ClickedResetAfterDelay()),
    Story.Command.expectExact(WaitBeforeReset),
    Story.message(Message.ClickedIncrement()),
    Story.model(model => {
      expect(model.count).toBe(6)
    }),
    Story.Command.expectExact(WaitBeforeReset),
    Story.Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
    Story.model(model => {
      expect(model.count).toBe(0)
    }),
  ),
)
