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
