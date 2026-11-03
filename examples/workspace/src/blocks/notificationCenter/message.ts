import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  TickedClock: { timestamp: Schema.Number },
  ClickedMarkAllAsRead: { recipientId: Schema.String },
  ClickedNotificationReadState: { notificationId: Schema.String },
  ClickedNotification: { notificationId: Schema.String },
})
export type Message = typeof Message.Type
export type ClickedMarkAllAsRead = typeof Message.ClickedMarkAllAsRead.Type
export type ClickedNotificationReadState =
  typeof Message.ClickedNotificationReadState.Type
