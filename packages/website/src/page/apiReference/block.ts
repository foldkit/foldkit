import { Effect, Option } from 'effect'
import { Block } from 'foldkit'

import { LoadApiData, loadApiData } from './command'
import { type ApiData, ApiDataAsyncData } from './domain'
import { Message } from './message'
import { Model, disclosuresForApiData } from './model'
import {
  handleFailedLoadApiData,
  handleSucceededLoadApiData,
  handleToggledSignature,
  refreshApiDataStep,
} from './update'
import { type ViewInputs, view } from './view'

type ApiReferenceArgs = Readonly<{
  maybeApiData: Option.Option<ApiData>
}>

export class ApiReference extends Block<
  ApiReference,
  ApiReferenceArgs,
  ViewInputs
>()('ApiReference', {
  Model,
  Message,
  Command: [LoadApiData],
}) {}

export const ApiReferenceLive = ApiReference.make(
  Effect.fn(function* (_id, { maybeApiData }) {
    return {
      model: Option.match(maybeApiData, {
        onNone: () => ({
          apiData: ApiDataAsyncData.Loading(),
          disclosures: {},
        }),
        onSome: apiData => ({
          apiData: ApiDataAsyncData.Refreshing({ data: apiData }),
          disclosures: disclosuresForApiData(apiData),
        }),
      }),

      start: [LoadApiData()],

      update: {
        InformedOfRouteChange: refreshApiDataStep,
        SucceededLoadApiData: handleSucceededLoadApiData,
        FailedLoadApiData: handleFailedLoadApiData,
        ToggledSignature: handleToggledSignature,
      },

      commands: {
        LoadApiData: () => loadApiData,
      },

      view,
    }
  }),
)
