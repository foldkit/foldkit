import { Option, Record, Result } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { LoadApiData } from './command'
import { ApiDataAsyncData } from './domain'
import type { Message } from './message'
import { type Model, disclosuresForApiData } from './model'

type SucceededLoadApiData = typeof Message.SucceededLoadApiData.Type
type FailedLoadApiData = typeof Message.FailedLoadApiData.Type
type ToggledSignature = typeof Message.ToggledSignature.Type

export const refreshApiDataStep = (model: Model) =>
  Option.match(
    AsyncData.isStale(model.apiData)
      ? AsyncData.revalidate(model.apiData)
      : AsyncData.loadIfMissing(model.apiData),
    {
      onNone: () => ({ model }),
      onSome: apiData => ({
        model: modifyFields(model, { apiData: () => apiData }),
        commands: [LoadApiData()],
      }),
    },
  )

export const handleSucceededLoadApiData = (
  model: Model,
  { apiData }: SucceededLoadApiData,
) => ({
  model: modifyFields(model, {
    apiData: () => ApiDataAsyncData.Success({ data: apiData }),
    disclosures: disclosures =>
      Record.union(
        disclosures,
        disclosuresForApiData(apiData),
        isOpen => isOpen,
      ),
  }),
})

export const handleFailedLoadApiData = (
  model: Model,
  { error }: FailedLoadApiData,
) => ({
  model: modifyFields(model, {
    apiData: apiData => AsyncData.settle(apiData, Result.fail(error)),
  }),
})

export const handleToggledSignature = (
  model: Model,
  { id, isOpen }: ToggledSignature,
) => ({
  model: modifyFields(model, {
    disclosures: disclosures => Record.set(disclosures, id, isOpen),
  }),
})
