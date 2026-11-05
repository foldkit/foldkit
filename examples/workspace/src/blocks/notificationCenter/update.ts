import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep } from './block'
import { NotificationCenterComposition, PopoverBinding } from './composition'
import type {
  ClickedMarkAllAsRead,
  ClickedNotificationReadState,
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

const handleClickedNotificationReadState = makeFieldsStep.fromMessage(
  ({ notificationId }: ClickedNotificationReadState) => ({
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
  TickedClock: makeFieldsStep.fromMessage(({ timestamp }) => ({
    now: () => timestamp,
  })),
  ClickedMarkAllAsRead: handleClickedMarkAllAsRead,
  ClickedNotificationReadState: handleClickedNotificationReadState,
  ClickedNotification: (model, { notificationId }) =>
    Option.match(
      Array.findFirst(
        model.notifications,
        notification => notification.id === notificationId,
      ),
      {
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
      },
    ),
})
