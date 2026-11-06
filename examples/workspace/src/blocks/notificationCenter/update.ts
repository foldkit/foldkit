import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Notification } from '../../domain'
import { makeFieldsStep, makeNoopStep } from './block'
import { NotificationCenterComposition, PopoverBinding } from './composition'
import type {
  ClickedMarkAllAsRead,
  ClickedNotificationReadToggle,
} from './message'
import { OutMessage } from './outMessage'

const handleClickedMarkAllAsRead = makeFieldsStep.fromMessage(
  ({ recipientId }: ClickedMarkAllAsRead) => ({
    notifications: Array.map(notification =>
      notification.recipientId === recipientId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }),
)

const handleClickedNotificationReadToggle = makeFieldsStep.fromMessage(
  ({ notificationId }: ClickedNotificationReadToggle) => ({
    notifications: Array.map(notification =>
      notification.id === notificationId
        ? modifyFields(notification, {
            isRead: isRead => !isRead,
          })
        : notification,
    ),
  }),
)

const markAsRead = (notificationId: string) =>
  makeFieldsStep(() => ({
    notifications: Array.map(notification =>
      notification.id === notificationId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }))

export const update = NotificationCenterComposition.makeUpdate({
  TickedClock: makeFieldsStep.fromMessage(({ currentTimeMillis }) => ({
    currentTimeMillis: () => currentTimeMillis,
  })),
  ClickedMarkAllAsRead: handleClickedMarkAllAsRead,
  ClickedNotificationReadToggle: handleClickedNotificationReadToggle,
  ClickedNotification: (model, { notificationId }) =>
    Option.match(Notification.findById(model.notifications, notificationId), {
      onNone: () => makeNoopStep()(model),
      onSome: notification => {
        const notificationSelection = Update.combineSteps(model, [
          markAsRead(notificationId),
          PopoverBinding.requestClose(),
        ])

        return pipe(
          notificationSelection,
          Update.withOutMessage(
            OutMessage.SelectedIssue({ issueId: notification.issueId }),
          ),
        )
      },
    }),
})
