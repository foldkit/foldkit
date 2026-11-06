import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  Message,
  Model,
  WaitBeforeReset,
  layer,
  update,
} from './block'

it.effect('resets the count after waiting', () =>
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(Model.make({ count: 5 })),
    Story.message(Message.ClickedResetAfterDelay()),
    Story.Command.expectExact(WaitBeforeReset),
    Story.Command.resolve(WaitBeforeReset, Message.CompletedWaitBeforeReset()),
    Story.model(model => {
      expect(model.count).toBe(0)
    }),
  ),
)
