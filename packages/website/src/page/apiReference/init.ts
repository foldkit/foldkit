import { Command } from 'foldkit'

import { type Message, RequestedApiData } from './message'
import { ApiDataAsyncData, type Model } from './model'
import { update } from './update'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    apiData: ApiDataAsyncData.Idle(),
    disclosures: {},
  },
  [],
]

export const boot = (): InitReturn => {
  const [model, initCommands] = init()
  const [bootedModel, bootCommands] = update(model, RequestedApiData())
  return [bootedModel, [...initCommands, ...bootCommands]]
}
