import { Effect } from 'effect'
import { HttpClient } from 'effect/http'
import { Command } from 'foldkit'

import { Message, fetchCount } from './counterHttpCommand'

export const FetchCount = Command.define('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  execute: Effect.flatMap(HttpClient.HttpClient, fetchCount),
})
