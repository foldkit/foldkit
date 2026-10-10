import { Effect } from 'effect'
import { HttpClient } from 'effect/http'
import { Command } from 'foldkit'

import { Message, fetchCount } from './counterHttpCommand'

export const FetchCount = Command.define(
  'FetchCount',
  {
    messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  },
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  }),
)

export const EffectsLayer = FetchCount.layer
