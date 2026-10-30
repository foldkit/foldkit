import { Command, given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  Application,
  ApplicationLive,
  WaitBeforeReset,
} from './counterCommands'

describe('delayed reset', () => {
  it.effect('resets the count after waiting', () =>
    story(
      ApplicationLive,
      given({ count: 5 }),
      message(Application.Message.ClickedResetAfterDelay()),
      Command.expectExact(WaitBeforeReset),
      Command.resolve(
        WaitBeforeReset,
        Application.Message.CompletedWaitBeforeReset(),
      ),
      model(model => {
        expect(model.count).toBe(0)
      }),
    ),
  )
})
