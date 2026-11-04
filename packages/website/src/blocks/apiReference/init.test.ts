import { Effect, Layer, Option } from 'effect'
import { type TestBlock, withBlock } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { ApiReferenceBlock, layer } from './block'
import { LoadApiData } from './command'
import {
  ApiData,
  ApiDataAsyncData,
  ApiFunction,
  ApiModule,
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
} from './domain'
import { Message } from './message'
import { type Model } from './model'

const apiReferenceSubject = { block: ApiReferenceBlock, layer }

const apiModule = ApiModule.make({
  name: 'Command',
  functions: [
    ApiFunction.make({
      name: 'define',
      description: Option.none(),
      signatures: [
        {
          parameters: [],
          returnType: 'A'.repeat(SIGNATURE_COLLAPSE_THRESHOLD + 1),
          typeParameters: [],
        },
      ],
      sourceUrl: Option.none(),
    }),
  ],
  types: [],
  interfaces: [],
  variables: [],
})
const seededData = ApiData.make({
  parsedApi: { modules: [apiModule] },
  highlights: {},
})
const fullData = ApiData.make({
  parsedApi: {
    modules: [apiModule, { ...apiModule, name: 'Update' }],
  },
  highlights: {},
})
const signatureId = scopedId('function', 'Command', 'define')

const makeFixture = (block: TestBlock<typeof apiReferenceSubject>) => {
  const init = block.init
  const update = block.update
  const failedLoad = (model: Model) =>
    update(model, Message.FailedLoadApiData({ error: 'Offline' }))
  return { block, init, update, failedLoad }
}

describe('API Reference startup', () => {
  test('cold startup schedules the full reference load', async () => {
    await Effect.runPromise(
      withBlock(apiReferenceSubject, executable => {
        const { block, init } = makeFixture(executable)

        const initialDataLoad = init()

        expect(initialDataLoad.model.apiData).toEqual(
          ApiDataAsyncData.Loading(),
        )
        expect(initialDataLoad.model.disclosures).toEqual({})
        expect(initialDataLoad.commands).toHaveLength(1)
        expect(initialDataLoad.commands?.map(command => command.name)).toEqual([
          LoadApiData.name,
        ])
        expectTypeOf<
          Layer.Services<typeof block.EffectsLayer>
        >().toEqualTypeOf<never>()
      }),
    )
  })

  test('prerendered data stays visible while the full reference loads', async () => {
    await Effect.runPromise(
      withBlock(apiReferenceSubject, executable => {
        const { block, init } = makeFixture(executable)

        const initialDataLoad = init(Option.some(seededData))

        expect(initialDataLoad.model.apiData).toEqual(
          ApiDataAsyncData.Refreshing({ data: seededData }),
        )
        expect(initialDataLoad.model.disclosures).toEqual({
          [signatureId]: false,
        })
        expect(initialDataLoad.commands?.map(command => command.name)).toEqual([
          LoadApiData.name,
        ])
        expect(
          block.operations.informRouteChange(initialDataLoad.model),
        ).toEqual({
          model: initialDataLoad.model,
        })
      }),
    )
  })

  test('failed cold loads can be requested again', async () => {
    await Effect.runPromise(
      withBlock(apiReferenceSubject, executable => {
        const { block, init, failedLoad } = makeFixture(executable)

        const initialDataLoad = init()
        const apiReferenceFailure = failedLoad(initialDataLoad.model)
        const retry = block.operations.informRouteChange(
          apiReferenceFailure.model,
        )

        expect(apiReferenceFailure.model.apiData).toEqual(
          ApiDataAsyncData.Failure({ error: 'Offline' }),
        )
        expect(retry.model.apiData).toEqual(ApiDataAsyncData.Loading())
        expect(retry.commands?.map(command => command.name)).toEqual([
          LoadApiData.name,
        ])
      }),
    )
  })

  test('failed full loads retain the seeded slice and retry on entry', async () => {
    await Effect.runPromise(
      withBlock(apiReferenceSubject, executable => {
        const { block, init, failedLoad } = makeFixture(executable)

        const initialDataLoad = init(Option.some(seededData))
        const apiReferenceFailure = failedLoad(initialDataLoad.model)
        const retry = block.operations.informRouteChange(
          apiReferenceFailure.model,
        )

        expect(apiReferenceFailure.model.apiData).toEqual(
          ApiDataAsyncData.Stale({ data: seededData, error: 'Offline' }),
        )
        expect(apiReferenceFailure.model.disclosures).toEqual({
          [signatureId]: false,
        })
        expect(retry.model.apiData).toEqual(
          ApiDataAsyncData.Refreshing({ data: seededData }),
        )
        expect(retry.commands?.map(command => command.name)).toEqual([
          LoadApiData.name,
        ])
        expect(block.operations.informRouteChange(retry.model)).toEqual({
          model: retry.model,
        })
      }),
    )
  })

  test('full success adds disclosures without resetting the seeded selection', async () => {
    await Effect.runPromise(
      withBlock(apiReferenceSubject, executable => {
        const { block, init, update } = makeFixture(executable)

        const initialDataLoad = init(Option.some(seededData))
        const expandedModel = modifyFields(initialDataLoad.model, {
          disclosures: () => ({ [signatureId]: true }),
        })
        const succeededLoad = update(
          expandedModel,
          Message.SucceededLoadApiData({ apiData: fullData }),
        )

        expect(succeededLoad.model.apiData).toEqual(
          ApiDataAsyncData.Success({ data: fullData }),
        )
        expect(succeededLoad.model.disclosures).toEqual({
          [signatureId]: true,
          [scopedId('function', 'Update', 'define')]: false,
        })
        expect(block.operations.informRouteChange(succeededLoad.model)).toEqual(
          {
            model: succeededLoad.model,
          },
        )
      }),
    )
  })
})
