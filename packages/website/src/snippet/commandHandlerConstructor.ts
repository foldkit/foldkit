import { Schema } from 'effect'
import { HttpClient } from 'effect/http'
import { Block } from 'foldkit'

import { Message, Model, fetchCount } from './counterHttpCommand'

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeCommand } = ApplicationBlock

export const FetchCount = makeCommand('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  },
})

export const EffectsLayer = FetchCount.layer
