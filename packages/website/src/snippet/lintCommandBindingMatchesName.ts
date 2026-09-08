import { Effect } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchUser: {},
})

// ❌ Bad
const SaveUser = Command.define('FetchUser', {
  messages: [Message.CompletedFetchUser],
  execute: Effect.succeed(Message.CompletedFetchUser()),
})

// ✅ Good
const FetchUser = Command.define('FetchUser', {
  messages: [Message.CompletedFetchUser],
  execute: Effect.succeed(Message.CompletedFetchUser()),
})
