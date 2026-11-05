import { type Layer, Option } from 'effect'
import {
  Command,
  type TestBlock,
  inMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import { LoadApiData } from './command'
import {
  ApiData,
  ApiDataAsyncData,
  ApiFunction,
  ApiModule,
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
} from './domain'
import { InMessage } from './inMessage'
import { ApiReferenceBlock, layer } from './index'
import { Message } from './message'
import type { Model } from './model'

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

describe('API Reference startup', () => {
  it.effect('cold startup schedules the full reference load', () => {
    expectTypeOf<
      Layer.Services<TestBlock<typeof apiReferenceSubject>['EffectsLayer']>
    >().toEqualTypeOf<never>()

    return story(
      apiReferenceSubject,
      init(),
      model(model => {
        expect(model.apiData).toEqual(ApiDataAsyncData.Loading())
        expect(model.disclosures).toEqual({})
      }),
      Command.expectExact(LoadApiData),
      Command.resolve(
        LoadApiData,
        Message.SucceededLoadApiData({ apiData: fullData }),
      ),
    )
  })

  it.effect(
    'prerendered data stays visible while the full reference loads',
    () => {
      let initialModel: Model | undefined

      return story(
        apiReferenceSubject,
        init(Option.some(seededData)),
        model(model => {
          initialModel = model
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        Command.expectExact(LoadApiData),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => expect(model).toBe(initialModel)),
        Command.expectExact(LoadApiData),
        Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
      )
    },
  )

  it.effect('failed cold loads can be requested again', () =>
    story(
      apiReferenceSubject,
      init(),
      Command.resolve(
        LoadApiData,
        Message.FailedLoadApiData({ error: 'Offline' }),
      ),
      model(model =>
        expect(model.apiData).toEqual(
          ApiDataAsyncData.Failure({ error: 'Offline' }),
        ),
      ),
      inMessage(InMessage.InformedOfRouteChange()),
      model(model => expect(model.apiData).toEqual(ApiDataAsyncData.Loading())),
      Command.expectExact(LoadApiData),
      Command.resolve(
        LoadApiData,
        Message.SucceededLoadApiData({ apiData: fullData }),
      ),
    ),
  )

  it.effect(
    'failed full loads retain the seeded slice and retry on entry',
    () => {
      let retryModel: Model | undefined

      return story(
        apiReferenceSubject,
        init(Option.some(seededData)),
        Command.resolve(
          LoadApiData,
          Message.FailedLoadApiData({ error: 'Offline' }),
        ),
        model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Stale({ data: seededData, error: 'Offline' }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => {
          retryModel = model
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
        }),
        Command.expectExact(LoadApiData),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => expect(model).toBe(retryModel)),
        Command.expectExact(LoadApiData),
        Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
      )
    },
  )

  it.effect(
    'full success adds disclosures without resetting the seeded selection',
    () => {
      let succeededModel: Model | undefined

      return story(
        apiReferenceSubject,
        init(Option.some(seededData)),
        message(Message.ToggledSignature({ id: signatureId, isOpen: true })),
        Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
        model(model => {
          succeededModel = model
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Success({ data: fullData }),
          )
          expect(model.disclosures).toEqual({
            [signatureId]: true,
            [scopedId('function', 'Update', 'define')]: false,
          })
        }),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => expect(model).toBe(succeededModel)),
        Command.expectNone(),
      )
    },
  )
})
