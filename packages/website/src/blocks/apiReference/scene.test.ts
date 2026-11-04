import { Effect, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { expect, given, role, scene } from 'foldkit/scene'
import { type TestBlock, withBlock } from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
import * as Url from 'foldkit/url'
import { describe, test } from 'vitest'

import { ApplicationBlock, layer } from '../../block'
import { ApiReferenceBinding } from '../../composition'
import { Deployment } from '../../deployment'
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

const makeFixture = (block: TestBlock<typeof application>) => {
  const init = block.init
  const update = block.update
  const view = block.view

  return { block, init, update, view }
}

describe('prerendered API Reference', () => {
  test('displays the seeded module during refresh and after full-load failure', async () => {
    await Effect.runPromise(
      withBlock(application, executable => {
        const { block, init, update, view } = makeFixture(executable)

        const initialization = init(
          {
            currentYear: 2026,
            today: Calendar.make(2026, 8, 30),
            deployment: Deployment.Canary({ commit: 'test' }),
            maybeApiData: Option.some(seededData),
            maybeExampleSources: Option.none(),
          },
          url,
        )
        scene(
          { update, view },
          given(initialization.model),
          expect(role('heading', { name: 'SeededCommand' })).toExist(),
        )
        const failedLoad = update(
          initialization.model,
          toParentMessageFor(block)(
            ApiReferenceBinding,
            ApiReferenceMessage.FailedLoadApiData({ error: 'Offline' }),
          ),
        )
        scene(
          { update, view },
          given(failedLoad.model),
          expect(role('heading', { name: 'SeededCommand' })).toExist(),
        )
      }),
    )
  })
})
