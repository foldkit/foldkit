import { Command } from 'foldkit'

import type { Message } from './message'
import { ApiDataRemoteData, type Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    apiData: ApiDataRemoteData.NotAsked(),
    disclosures: {},
  },
  [],
]
