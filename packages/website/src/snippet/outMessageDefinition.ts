import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  SubmittedLoginForm: {},
  SucceededAuthenticate: { sessionId: Schema.String },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SucceededLogin: { sessionId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
