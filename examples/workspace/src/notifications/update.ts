import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeNotifications } from '../domain'
import { NotificationCenterComposition, PopoverBinding } from './composition'
import { Message, OutMessage, makeFieldsStep, makeNoopStep } from './definition'

const handleInformedOfActivityStep = makeFieldsStep.fromMessage(
  ({ activity }: typeof Message.InformedOfActivity.Type) => ({
    notifications: notifications => {
      const incoming = Array.dedupeWith(
        makeNotifications(activity),
        (left, right) => left.id === right.id,
      )

      const unseen = Array.filter(
        incoming,
        notification =>
          !Array.some(notifications, current => current.id === notification.id),
      )

      return [...unseen, ...notifications]
    },
  }),
)

const handleClickedMarkAllAsReadStep = makeFieldsStep.fromMessage(
  ({ recipientId }: typeof Message.ClickedMarkAllAsRead.Type) => ({
    notifications: Array.map(notification =>
      notification.recipientId === recipientId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }),
)

const handleClickedNotificationReadStateStep = makeFieldsStep.fromMessage(
  ({
    notificationId,
    recipientId,
  }: typeof Message.ClickedNotificationReadState.Type) => ({
    notifications: Array.map(notification =>
      notification.id === notificationId &&
      notification.recipientId === recipientId
        ? modifyFields(notification, {
            isRead: isRead => !isRead,
          })
        : notification,
    ),
  }),
)

const markAsReadStep = (notificationId: string, recipientId: string) =>
  makeFieldsStep(() => ({
    notifications: Array.map(notification =>
      notification.id === notificationId &&
      notification.recipientId === recipientId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }))

export const update = NotificationCenterComposition.makeUpdate({
  InformedOfActivity: handleInformedOfActivityStep,
  TickedClock: makeFieldsStep.fromMessage(({ timestamp }) => ({
    now: () => timestamp,
  })),
  ClickedMarkAllAsRead: handleClickedMarkAllAsReadStep,
  ClickedNotificationReadState: handleClickedNotificationReadStateStep,
  ClickedNotification: (model, { notificationId, recipientId }) =>
    Option.match(
      Array.findFirst(
        model.notifications,
        notification =>
          notification.id === notificationId &&
          notification.recipientId === recipientId,
      ),
      {
        onNone: () => makeNoopStep()(model),
        onSome: notification => {
          const selected = Update.combineSteps(model, [
            markAsReadStep(notificationId, recipientId),
            PopoverBinding.requestClose(),
          ])

          return pipe(
            selected,
            Update.withOutMessage(
              OutMessage.SelectedIssue({ issueId: notification.issueId }),
            ),
          )
        },
      },
    ),
})
