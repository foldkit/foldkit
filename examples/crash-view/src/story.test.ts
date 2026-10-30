import { Cause, Effect } from 'effect'
import { message, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message } from './application'

describe('update', () => {
  it.effect('handling any Message throws to trigger the crash view', () =>
    Effect.gen(function* () {
      const cause = yield* story(
        ApplicationLive,
        message(Message.ClickedCrash()),
      ).pipe(Effect.sandbox, Effect.flip)

      expect(Cause.pretty(cause)).toContain('This is a simulated crash!')
    }),
  )
})
