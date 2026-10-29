import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { NotificationActivity } from '../domain'

export const Message = defineMessageUnion({
  InformedOfActivity: { activity: NotificationActivity },
  TickedClock: { timestamp: Schema.Number },
  ClickedMarkAllAsRead: { recipientId: Schema.String },
  ClickedNotificationReadState: { notificationId: Schema.String },
  ClickedNotification: { notificationId: Schema.String },
})
export type Message = typeof Message.Type
export type InformedOfActivity = typeof Message.InformedOfActivity.Type
export type ClickedMarkAllAsRead = typeof Message.ClickedMarkAllAsRead.Type
export type ClickedNotificationReadState =
  typeof Message.ClickedNotificationReadState.Type
