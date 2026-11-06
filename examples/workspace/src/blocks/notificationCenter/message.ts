import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  TickedClock: { currentTimeMillis: Schema.Number },
  ClickedMarkAllAsRead: { recipientId: Schema.String },
  ClickedNotificationReadToggle: { notificationId: Schema.String },
  ClickedNotification: { notificationId: Schema.String },
})
export type Message = typeof Message.Type
export type ClickedMarkAllAsRead = typeof Message.ClickedMarkAllAsRead.Type
export type ClickedNotificationReadToggle =
  typeof Message.ClickedNotificationReadToggle.Type
