import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const ChatMessage = Schema.Struct({
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
  connection: ConnectionState,
  messages: Schema.Array(ChatMessage),
  messageInput: Schema.String,
})
export type Model = typeof Model.Type
