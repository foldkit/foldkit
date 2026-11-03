import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  Model,
  WaitBeforeReset,
  update,
} from './application'

it.effect('resets the count after waiting', () =>
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
