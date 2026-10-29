import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedConnect: {},
  ConnectedChatSocket: {},
  DisconnectedChatSocket: {},
  ReleasedChatSocket: {},
  FailedConnectChatSocket: { error: Schema.String },
  FailedChatSocket: { error: Schema.String },
  FailedSendMessage: { error: Schema.String },
  UpdatedMessageInput: { value: Schema.String },
  SubmittedMessage: {},
  SucceededSendMessage: { text: Schema.String },
  ReceivedMessage: { text: Schema.String },
  TimestampedMessage: {
    text: Schema.String,
    zoned: Schema.DateTimeZoned,
    isSent: Schema.Boolean,
  },
})
export type Message = typeof Message.Type
export type ReceivedMessage = typeof Message.ReceivedMessage.Type
export type DisconnectedChatSocket = typeof Message.DisconnectedChatSocket.Type
export type FailedChatSocket = typeof Message.FailedChatSocket.Type
