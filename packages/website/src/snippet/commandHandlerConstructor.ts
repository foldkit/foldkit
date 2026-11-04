import { Schema } from 'effect'
import { HttpClient } from 'effect/http'
import { Block } from 'foldkit'

import { Message, Model, fetchCount } from './counterHttpCommand'

export const ApplicationKey = Symbol('Application')

const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

export const FetchCount = ApplicationBlock.makeCommand('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  },
})

export const EffectsLayer = FetchCount.layer
