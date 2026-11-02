import { Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedFetchUser: { name: Schema.String },
})

export const FetchUser = Command.define('FetchUser', {
  args: { userId: Schema.String },
  messages: [Message.CompletedFetchUser],
})
