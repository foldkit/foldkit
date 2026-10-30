import { Effect } from 'effect'
import { model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { application } from './model.fixture'
import { ApplicationLayer } from './services'

describe('init', () => {
  it.effect('seeds loading state', () =>
    story(
      application,
      model(model => {
        expect(model.telemetry._tag).toBe('Loading')
      }),
    ).pipe(Effect.provide(ApplicationLayer)),
  )
})
