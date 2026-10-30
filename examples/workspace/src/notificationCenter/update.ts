import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeNotifications } from '../domain'
import { NotificationCenterComposition, PopoverBinding } from './composition'
import { makeFieldsStep, makeNoopStep } from './definition'
import type {
  ClickedMarkAllAsRead,
  ClickedNotificationReadState,
  InformedOfActivity,
} from './message'
import { OutMessage } from './outMessage'

const handleInformedOfActivity = makeFieldsStep.fromMessage(
  ({ activity }: InformedOfActivity) => ({
    notifications: notifications => {
      const incomingNotifications = makeNotifications(activity)

      const unseenNotifications = Array.filter(
        incomingNotifications,
        notification =>
          !Array.some(
            notifications,
            existingNotification => existingNotification.id === notification.id,
          ),
      )

      return [...unseenNotifications, ...notifications]
    },
  }),
)

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
  InformedOfActivity: handleInformedOfActivity,
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
