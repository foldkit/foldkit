import { type Update } from 'foldkit'

import { Message } from './message'
import { ApiDataAsyncData, type Model } from './model'
import { update } from './update'

export type InitReturn = Update.Return<Model, Message>

export const init = (): InitReturn => ({
  model: {
    apiData: ApiDataAsyncData.Idle(),
    disclosures: {},
  },
})

export const boot = (): InitReturn => {
  const initResult = init()
  const updateResult = update(initResult.model, Message.RequestedApiData())
  return {
    model: updateResult.model,
    commands: [
      ...(initResult.commands ?? []),
      ...(updateResult.commands ?? []),
    ],
  }
}
