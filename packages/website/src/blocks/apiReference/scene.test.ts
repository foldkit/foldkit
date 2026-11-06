import { Option, pipe } from 'effect'
import { Calendar, Scene } from 'foldkit'
import * as Url from 'foldkit/url'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { Deployment } from '../../deployment'
import { ApplicationBlock, layer } from '../../index'
import { resolveBrowserStartup } from '../../scene.fixture'
import { LoadApiData } from './command'
import { ApiData, ApiModule, ApiType } from './domain'
import { Message as ApiReferenceMessage } from './message'

const application = { block: ApplicationBlock, layer }
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
    () => {
      const flags = {
        currentYear: 2026,
        today: Calendar.make(2026, 8, 30),
        deployment: Deployment.Canary({ commit: 'test' }),
        maybeApiData: Option.some(seededData),
        maybeExampleSources: Option.none(),
      }

      return Scene.scene(
        application,
        Scene.init(flags, url),
        resolveBrowserStartup(flags),
        Scene.expect(
          Scene.role('heading', { name: 'SeededCommand' }),
        ).toExist(),
        Scene.Command.resolve(
          LoadApiData,
          ApiReferenceMessage.FailedLoadApiData({ error: 'Offline' }),
        ),
        Scene.expect(
          Scene.role('heading', { name: 'SeededCommand' }),
        ).toExist(),
      )
    },
  )
})
