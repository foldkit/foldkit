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

it.effect('resets the previous count after the delay completes', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Model.make({ count: 5 })),
    Story.models(
      Story.steps(
        Story.message(Message.ClickedResetAfterDelay()),
        Story.Command.resolve(
          WaitBeforeReset,
          Message.CompletedWaitBeforeReset(),
        ),
      ),
      (before, after) => {
        expect(before.count).toBe(5)
        expect(after.count).toBe(0)
      },
    ),
  ),
)
