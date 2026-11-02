import { defineMessageUnion } from 'foldkit/message'

import { NotificationActivity } from '../domain'

export const InMessage = defineMessageUnion({
  InformedOfActivity: { activity: NotificationActivity },
})
export type InMessage = typeof InMessage.Type
export type InformedOfActivity = typeof InMessage.InformedOfActivity.Type
