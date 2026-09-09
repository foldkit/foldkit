import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

export const Message = defineMessageUnion({
  SubmittedLoginForm: {},
  SucceededAuthenticate: { sessionId: Schema.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SucceededLogin: { sessionId: Schema.String },
})
export type OutMessage = typeof OutMessage.Type
