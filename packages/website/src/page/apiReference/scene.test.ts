import { Layer, Option, pipe } from 'effect'
import { Block, Calendar } from 'foldkit'
import { deliver, expect, role, scene } from 'foldkit/scene'
import * as Url from 'foldkit/url'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from '../../block'
import { Deployment } from '../../deployment'
import { ApplicationServerLayer } from '../../services'
import { ApiReference } from './block'
import { ApiData, ApiModule, ApiType } from './domain'
const seededData = ApiData.make({
  parsedApi: {
    modules: [
      ApiModule.make({
        name: 'Command',
        functions: [],
        types: [
          ApiType.make({
            name: 'SeededCommand',
            description: Option.none(),
            typeDefinition: 'type SeededCommand = string',
            sourceUrl: Option.none(),
          }),
        ],
        interfaces: [],
        variables: [],
      }),
    ],
  },
  highlights: {},
})
const url = pipe(
  Url.fromString('https://foldkit.dev/api-reference/command'),
  Option.getOrThrow,
)
describe('prerendered API Reference', () => {
  it.effect(
    'displays the seeded module during refresh and after full-load failure',
    () =>
      scene(
        ApplicationLive.pipe(Layer.provide(ApplicationServerLayer)),
        {
          flags: {
            currentYear: 2026,
            today: Calendar.make(2026, 8, 30),
            deployment: Deployment.Canary({ commit: 'test' }),
            maybeApiData: Option.some(seededData),
            maybeExampleSources: Option.none(),
          },
          url,
        },
        expect(role('heading', { name: 'SeededCommand' })).toExist(),
        deliver(
          Block.deliver(
            ApiReference,
            'apiReference',
            ApiReference.Message.FailedLoadApiData({ error: 'Offline' }),
          ),
        ),
        expect(role('heading', { name: 'SeededCommand' })).toExist(),
      ),
  )
})
