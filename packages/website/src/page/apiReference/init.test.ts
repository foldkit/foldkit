import { Option } from 'effect'
import { Command, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { ApiReferenceBlock } from './block'
import {
  ApiData,
  ApiDataAsyncData,
  ApiFunction,
  ApiModule,
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
} from './domain'
import { init } from './init'
import { Message } from './message'
import { type Model } from './model'
import { LoadApiData, update } from './update'

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

const failedLoad = (model: Model) =>
  update(model, Message.FailedLoadApiData({ error: 'Offline' }))

describe('API Reference startup', () => {
  test('cold startup schedules the full reference load', () => {
    const initialDataLoad = init()

    expect(initialDataLoad.model.apiData).toEqual(ApiDataAsyncData.Loading())
    expect(initialDataLoad.model.disclosures).toEqual({})
    expect(initialDataLoad.commands).toHaveLength(1)
    expect(initialDataLoad.commands?.map(command => command.name)).toEqual([
      LoadApiData.name,
    ])
    expectTypeOf<Update.RequirementsOf<typeof init>>().toEqualTypeOf<
      Command.HandlerOf<typeof LoadApiData>
    >()
  })

  test('prerendered data stays visible while the full reference loads', () => {
    const initialDataLoad = init(Option.some(seededData))

    expect(initialDataLoad.model.apiData).toEqual(
      ApiDataAsyncData.Refreshing({ data: seededData }),
    )
    expect(initialDataLoad.model.disclosures).toEqual({ [signatureId]: false })
    expect(initialDataLoad.commands?.map(command => command.name)).toEqual([
      LoadApiData.name,
    ])
    expect(
      ApiReferenceBlock.operations.informRouteChanged(initialDataLoad.model),
    ).toEqual({
      model: initialDataLoad.model,
    })
  })

  test('failed cold loads can be requested again', () => {
    const initialDataLoad = init()
    const apiReferenceFailure = failedLoad(initialDataLoad.model)
    const retry = ApiReferenceBlock.operations.informRouteChanged(
      apiReferenceFailure.model,
    )

    expect(apiReferenceFailure.model.apiData).toEqual(
      ApiDataAsyncData.Failure({ error: 'Offline' }),
    )
    expect(retry.model.apiData).toEqual(ApiDataAsyncData.Loading())
    expect(retry.commands?.map(command => command.name)).toEqual([
      LoadApiData.name,
    ])
  })

  test('failed full loads retain the seeded slice and retry on entry', () => {
    const initialDataLoad = init(Option.some(seededData))
    const apiReferenceFailure = failedLoad(initialDataLoad.model)
    const retry = ApiReferenceBlock.operations.informRouteChanged(
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
    expect(
      ApiReferenceBlock.operations.informRouteChanged(retry.model),
    ).toEqual({
      model: retry.model,
    })
  })

  test('full success adds disclosures without resetting the seeded selection', () => {
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
    expect(
      ApiReferenceBlock.operations.informRouteChanged(succeededLoad.model),
    ).toEqual({
      model: succeededLoad.model,
    })
  })
})
