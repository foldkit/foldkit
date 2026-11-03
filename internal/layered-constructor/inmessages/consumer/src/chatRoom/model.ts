import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { MessageComposerContract } from '../messageComposer/definition'

export const ChatMessage = Schema.Struct({
  id: Schema.Number,
  text: Schema.String,
  zoned: Schema.DateTimeZoned,
  isSent: Schema.Boolean,
})
export type ChatMessage = typeof ChatMessage.Type

export const ConnectionState = defineTaggedUnion({
  Disconnected: {},
  Connecting: {},
  Connected: {},
  Error: { error: Schema.String },
})
export type ConnectionState = typeof ConnectionState.Type

export const Model = Schema.Struct({
  title: Schema.String,
  connection: ConnectionState,
  messages: Schema.Array(ChatMessage),
  nextMessageId: Schema.Number,
  messageComposer: MessageComposerContract.Model,
})
export type Model = typeof Model.Type
