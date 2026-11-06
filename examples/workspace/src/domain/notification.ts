import { Array, HashSet, Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import * as Issue from './issue'

export const Kind = defineTaggedUnion({
  Commented: { body: Schema.String },
  Assigned: {},
})
export type Kind = typeof Kind.Type

export const Notification = Schema.Struct({
  id: Schema.String,
  recipientId: Schema.String,
  actorId: Schema.String,
  issueId: Schema.String,
  kind: Kind,
  createdAt: Schema.String,
  isRead: Schema.Boolean,
})
export type Notification = typeof Notification.Type

export const forIssueComment = (issue: Issue.Issue, comment: Issue.Comment) => {
  const recipientIds = Array.dedupe([
    ...Option.toArray(issue.maybeAssigneeId),
    ...Array.map(issue.comments, issueComment => issueComment.authorId),
  ])

  return Array.map(
    Array.filter(recipientIds, recipientId => recipientId !== comment.authorId),
    recipientId =>
      Notification.make({
        id: `comment:${comment.id}:${recipientId}`,
        recipientId,
        actorId: comment.authorId,
        issueId: issue.id,
        kind: Kind.Commented({ body: comment.body }),
        createdAt: comment.createdAt,
        isRead: false,
      }),
  )
}

export const forIssueAssignment = (
  issue: Issue.Issue,
  actorId: string,
  createdAt: string,
) => {
  const { maybeAssigneeId } = issue

  if (Option.isNone(maybeAssigneeId)) {
    return []
  }

  const recipientId = maybeAssigneeId.value

  if (recipientId === actorId) {
    return []
  }

  return [
    Notification.make({
      id: `assignment:${issue.id}:${issue.version}:${recipientId}`,
      recipientId,
      actorId,
      issueId: issue.id,
      kind: Kind.Assigned(),
      createdAt,
      isRead: false,
    }),
  ]
}

export const prependMissing = (
  notifications: ReadonlyArray<Notification>,
  incomingNotifications: ReadonlyArray<Notification>,
) => {
  const existingIds = HashSet.fromIterable(
    Array.map(notifications, notification => notification.id),
  )
  const newNotifications = Array.filter(
    incomingNotifications,
    notification => !HashSet.has(existingIds, notification.id),
  )

  return [...newNotifications, ...notifications]
}

export const findById = (
  notifications: ReadonlyArray<Notification>,
  notificationId: string,
) =>
  Array.findFirst(
    notifications,
    notification => notification.id === notificationId,
  )
