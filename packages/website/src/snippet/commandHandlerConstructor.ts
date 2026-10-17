import { HttpClient } from 'effect/http'
import { defineApplication } from 'foldkit'

import { Message, Model, fetchCount } from './counterHttpCommand'

const Application = defineApplication({ Model, Message })

export const FetchCount = Application.command('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  },
})

export const EffectsLayer = FetchCount.layer
