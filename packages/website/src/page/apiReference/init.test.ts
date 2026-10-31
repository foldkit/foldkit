import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { ApiReferenceLive } from './block'
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

const coldStart = { maybeApiData: Option.none() }
const seededStart = { maybeApiData: Option.some(seededData) }

const failLoad = message(Message.FailedLoadApiData({ error: 'Offline' }))

describe('API Reference startup', () => {
  it.effect('cold startup begins loading the full reference', () =>
    story(
      ApiReferenceLive,
      coldStart,
      model(model => {
        expect(model.apiData).toEqual(ApiDataAsyncData.Loading())
        expect(model.disclosures).toEqual({})
      }),
    ),
  )

  it.effect(
    'prerendered data stays visible while the full reference loads',
    () =>
      story(
        ApiReferenceLive,
        seededStart,
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        message(Message.InformedOfRouteChange()),
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
        }),
        Command.expectNone(),
      ),
  )

  it.effect('failed cold loads can be requested again', () =>
    story(
      ApiReferenceLive,
      coldStart,
      failLoad,
      model(model => {
        expect(model.apiData).toEqual(
          ApiDataAsyncData.Failure({ error: 'Offline' }),
        )
      }),
      message(Message.InformedOfRouteChange()),
      model(model => {
        expect(model.apiData).toEqual(ApiDataAsyncData.Loading())
      }),
      Command.expectExact(LoadApiData),
      Command.resolve(
        LoadApiData,
        Message.SucceededLoadApiData({ apiData: seededData }),
      ),
    ),
  )

  it.effect(
    'failed full loads retain the seeded slice and retry on entry',
    () =>
      story(
        ApiReferenceLive,
        seededStart,
        failLoad,
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Stale({ data: seededData, error: 'Offline' }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        message(Message.InformedOfRouteChange()),
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
        }),
        Command.expectExact(LoadApiData),
        message(Message.InformedOfRouteChange()),
        Command.expectExact(LoadApiData),
        Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
      ),
  )

  it.effect(
    'full success adds disclosures without resetting the seeded selection',
    () =>
      story(
        ApiReferenceLive,
        seededStart,
        given({
          apiData: ApiDataAsyncData.Refreshing({ data: seededData }),
          disclosures: { [signatureId]: true },
        }),
        message(Message.SucceededLoadApiData({ apiData: fullData })),
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Success({ data: fullData }),
          )
          expect(model.disclosures).toEqual({
            [signatureId]: true,
            [scopedId('function', 'Update', 'define')]: false,
          })
        }),
        message(Message.InformedOfRouteChange()),
        Command.expectNone(),
      ),
  )
})
