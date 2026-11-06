import { Notification } from '../../domain'
import { makeFieldsStep } from './block'
import { NotificationCenterComposition } from './composition'

export const inMessageUpdate =
  NotificationCenterComposition.makeInMessageUpdate({
    InformedOfIssueComment: makeFieldsStep.fromMessage(
      ({ issue, comment }) => ({
        notifications: notifications =>
          Notification.prependMissing(
            notifications,
            Notification.forIssueComment(issue, comment),
          ),
      }),
    ),
    InformedOfIssueAssignment: makeFieldsStep.fromMessage(
      ({ issue, actorId, createdAt }) => ({
        notifications: notifications =>
          Notification.prependMissing(
            notifications,
            Notification.forIssueAssignment(issue, actorId, createdAt),
          ),
      }),
    ),
  })
