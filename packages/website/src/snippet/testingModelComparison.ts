import { Command, given, message, models, steps, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  Model,
  WaitBeforeReset,
  layer,
} from './counterCommands'

it.effect('resets the previous count after the delay completes', () =>
  story(
    { block: ApplicationBlock, layer },
    given(Model.make({ count: 5 })),
    models(
      steps(
        message(Message.ClickedResetAfterDelay()),
        Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
      ),
      (before, after) => {
        expect(before.count).toBe(5)
        expect(after.count).toBe(0)
      },
    ),
  ),
)
