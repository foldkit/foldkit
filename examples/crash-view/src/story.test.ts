import { Effect, Exit } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, layer } from './block'

describe('update', () => {
  it.effect('handling any Message throws to trigger the crash view', () =>
    Effect.gen(function* () {
      const outcome = yield* Effect.exit(
        Story.story(
          { block: ApplicationBlock, layer },
          Story.init(),
          Story.message(Message.ClickedCrash()),
        ),
      )

      expect(outcome).toEqual(Exit.die(new Error('This is a simulated crash!')))
    }),
  )
})
