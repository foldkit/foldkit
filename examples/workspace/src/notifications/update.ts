import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeNotifications } from '../domain'
import { NotificationCenterComposition, PopoverBinding } from './composition'
import { Message, NotificationCenterDefinition, OutMessage } from './definition'

const handleInformedOfActivity =
  NotificationCenterDefinition.makeFieldsStep.fromMessage(
    ({ activity }: typeof Message.InformedOfActivity.Type) => ({
      notifications: notifications => {
        const incoming = Array.dedupeWith(
          makeNotifications(activity),
          (left, right) => left.id === right.id,
        )

        const unseen = Array.filter(
          incoming,
          notification =>
            !Array.some(
              notifications,
              current => current.id === notification.id,
            ),
        )

        return [...unseen, ...notifications]
      },
    }),
  )

const handleClickedMarkAllAsRead =
  NotificationCenterDefinition.makeFieldsStep.fromMessage(
    ({ recipientId }: typeof Message.ClickedMarkAllAsRead.Type) => ({
      notifications: Array.map(notification =>
        notification.recipientId === recipientId
          ? modifyFields(notification, { isRead: () => true })
          : notification,
      ),
    }),
  )

const handleClickedNotificationReadState =
  NotificationCenterDefinition.makeFieldsStep.fromMessage(
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

const markAsRead = (notificationId: string, recipientId: string) =>
  NotificationCenterDefinition.makeFieldsStep(() => ({
    notifications: Array.map(notification =>
      notification.id === notificationId &&
      notification.recipientId === recipientId
        ? modifyFields(notification, { isRead: () => true })
        : notification,
    ),
  }))

export const update = NotificationCenterComposition.makeUpdate({
  InformedOfActivity: handleInformedOfActivity,
  TickedClock: NotificationCenterDefinition.makeFieldsStep.fromMessage(
    ({ timestamp }) => ({ now: () => timestamp }),
  ),
  ClickedMarkAllAsRead: handleClickedMarkAllAsRead,
  ClickedNotificationReadState: handleClickedNotificationReadState,
  ClickedNotification: (model, { notificationId, recipientId }) =>
    Option.match(
      Array.findFirst(
        model.notifications,
        notification =>
          notification.id === notificationId &&
          notification.recipientId === recipientId,
      ),
      {
        onNone: () => NotificationCenterDefinition.makeNoopStep()(model),
        onSome: notification => {
          const selected = Update.combineSteps(model, [
            markAsRead(notificationId, recipientId),
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
