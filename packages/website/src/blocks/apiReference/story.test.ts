import { type Layer, Option } from 'effect'
import { Story } from 'foldkit'
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
      Layer.Services<
        Story.TestBlock<typeof apiReferenceSubject>['EffectsLayer']
      >
    >().toEqualTypeOf<never>()

    return Story.story(
      apiReferenceSubject,
      Story.init(),
      Story.model(model => {
        expect(model.apiData).toEqual(ApiDataAsyncData.Loading())
        expect(model.disclosures).toEqual({})
      }),
      Story.Command.expectExact(LoadApiData),
      Story.Command.resolve(
        LoadApiData,
        Message.SucceededLoadApiData({ apiData: fullData }),
      ),
    )
  })

  it.effect(
    'prerendered data stays visible while the full reference loads',
    () => {
      return Story.story(
        apiReferenceSubject,
        Story.init(Option.some(seededData)),
        Story.model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        Story.Command.expectExact(LoadApiData),
        Story.models(
          Story.steps(Story.inMessage(InMessage.InformedOfRouteChange())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectExact(LoadApiData),
        Story.Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
      )
    },
  )

  it.effect('failed cold loads can be requested again', () =>
    Story.story(
      apiReferenceSubject,
      Story.init(),
      Story.Command.resolve(
        LoadApiData,
        Message.FailedLoadApiData({ error: 'Offline' }),
      ),
      Story.model(model =>
        expect(model.apiData).toEqual(
          ApiDataAsyncData.Failure({ error: 'Offline' }),
        ),
      ),
      Story.inMessage(InMessage.InformedOfRouteChange()),
      Story.model(model =>
        expect(model.apiData).toEqual(ApiDataAsyncData.Loading()),
      ),
      Story.Command.expectExact(LoadApiData),
      Story.Command.resolve(
        LoadApiData,
        Message.SucceededLoadApiData({ apiData: fullData }),
      ),
    ),
  )

  it.effect(
    'failed full loads retain the seeded slice and retry on entry',
    () => {
      return Story.story(
        apiReferenceSubject,
        Story.init(Option.some(seededData)),
        Story.Command.resolve(
          LoadApiData,
          Message.FailedLoadApiData({ error: 'Offline' }),
        ),
        Story.model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Stale({ data: seededData, error: 'Offline' }),
          )
          expect(model.disclosures).toEqual({ [signatureId]: false })
        }),
        Story.inMessage(InMessage.InformedOfRouteChange()),
        Story.model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Refreshing({ data: seededData }),
          )
        }),
        Story.Command.expectExact(LoadApiData),
        Story.models(
          Story.steps(Story.inMessage(InMessage.InformedOfRouteChange())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectExact(LoadApiData),
        Story.Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
      )
    },
  )

  it.effect(
    'full success adds disclosures without resetting the seeded selection',
    () => {
      return Story.story(
        apiReferenceSubject,
        Story.init(Option.some(seededData)),
        Story.message(
          Message.ToggledSignature({ id: signatureId, isOpen: true }),
        ),
        Story.Command.resolve(
          LoadApiData,
          Message.SucceededLoadApiData({ apiData: fullData }),
        ),
        Story.model(model => {
          expect(model.apiData).toEqual(
            ApiDataAsyncData.Success({ data: fullData }),
          )
          expect(model.disclosures).toEqual({
            [signatureId]: true,
            [scopedId('function', 'Update', 'define')]: false,
          })
        }),
        Story.models(
          Story.steps(Story.inMessage(InMessage.InformedOfRouteChange())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
      )
    },
  )
})
