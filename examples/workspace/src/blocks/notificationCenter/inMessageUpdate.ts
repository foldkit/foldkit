import { Array } from 'effect'

import { makeNotifications } from '../../domain'
import { NotificationCenterComposition } from './composition'
import { makeFieldsStep } from './definition'
import type { InformedOfActivity } from './inMessage'

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

export const inMessageUpdate =
  NotificationCenterComposition.makeInMessageUpdate({
    InformedOfActivity: handleInformedOfActivity,
  })
