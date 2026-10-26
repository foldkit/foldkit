import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { PopoverBlock } from '@foldkit/ui'

import { Notification, NotificationActivity } from '../domain'

export const Model = Schema.Struct({
  notifications: Schema.Array(Notification),
  now: Schema.Number,
  popover: PopoverBlock.Model,
})

export const Message = defineMessageUnion({
  InformedOfActivity: { activity: NotificationActivity },
  TickedClock: { timestamp: Schema.Number },
  ClickedMarkAllAsRead: { recipientId: Schema.String },
  ClickedNotificationReadState: {
    notificationId: Schema.String,
    recipientId: Schema.String,
  },
  ClickedNotification: {
    notificationId: Schema.String,
    recipientId: Schema.String,
  },
})

export const OutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
})

export const NotificationCenterDefinition = Block.makeDefinition(
  'NotificationCenter',
  { Model, Message, OutMessage },
)

export const { makeFieldsStep, makeNoopStep } = NotificationCenterDefinition
