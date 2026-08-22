import { Array, Option, Record, pipe } from 'effect'
import { AsyncData, type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { LoadApiData } from './command'
import {
  SIGNATURE_COLLAPSE_THRESHOLD,
  scopedId,
  signaturesLength,
} from './domain'
import { Message } from './message'
import {
  type ApiData,
  ApiDataAsyncData,
  type Disclosures,
  type Model,
} from './model'

export type UpdateReturn = Update.Return<Model, Message>

const disclosuresForApiData = (apiData: ApiData): Disclosures =>
  pipe(
    apiData.parsedApi.modules,
    Array.flatMap(module =>
      pipe(
        module.functions,
        Array.filter(
          apiFunction =>
            signaturesLength(apiFunction) > SIGNATURE_COLLAPSE_THRESHOLD,
        ),
        Array.map(apiFunction => {
          const id = scopedId('function', module.name, apiFunction.name)
          return [id, false] as const
        }),
      ),
    ),
    Record.fromEntries,
  )

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    RequestedApiData: () =>
      Option.match(AsyncData.loadIfMissing(model.apiData), {
        onNone: () => ({ model }),
        onSome: apiData => ({
          model: evo(model, { apiData: () => apiData }),
          commands: [LoadApiData()],
        }),
      }),

    SucceededLoadApiData: ({ apiData }) => ({
      model: evo(model, {
        apiData: () => ApiDataAsyncData.Success({ data: apiData }),
        disclosures: () => disclosuresForApiData(apiData),
      }),
    }),

    FailedLoadApiData: ({ error }) => ({
      model: evo(model, {
        apiData: () => ApiDataAsyncData.Failure({ error }),
      }),
    }),

    ToggledSignature: ({ id, isOpen }) => ({
      model: evo(model, {
        disclosures: disclosures => Record.set(disclosures, id, isOpen),
      }),
    }),
  })

export const informRouteChanged = (model: Model) =>
  update(model, Message.RequestedApiData())
