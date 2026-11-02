import { Effect } from 'effect'
import { model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ApplicationTestLayer } from './layers'
import { ApplicationLive } from './layersApplication'

it.effect('starts by loading the user', () =>
  story(
    ApplicationLive,
    model(model => expect(model.user._tag).toBe('Loading')),
  ).pipe(Effect.provide(ApplicationTestLayer)),
)
