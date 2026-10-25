import { Array, DateTime, Option, Order, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

export const IssueStatus = Schema.Literals([
  'Backlog',
  'Todo',
  'InProgress',
  'Done',
])

export const issueStatusLabel = (status: typeof IssueStatus.Type) =>
  status === 'InProgress' ? 'In progress' : status

export const IssuePriority = Schema.Literals(['Low', 'Medium', 'High'])

export const GroupBy = Schema.Literals(['None', 'Status', 'Project'])

export const IssueFilters = Schema.Struct({
  query: Schema.String,
  maybeStatus: Schema.Option(IssueStatus),
  sort: Schema.Literals(['Identifier', 'Priority']),
  groupBy: GroupBy,
})

export const SavedView = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  filters: IssueFilters,
})

export const Comment = Schema.Struct({
  id: Schema.String,
  authorId: Schema.String,
  body: Schema.String,
  createdAt: Schema.String,
})

export const IssueDraft = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  status: IssueStatus,
  priority: IssuePriority,
  projectId: Schema.String,
  maybeAssigneeId: Schema.Option(Schema.String),
  labelIds: Schema.Array(Schema.String),
})

export const Issue = Schema.Struct({
  id: Schema.String,
  identifier: Schema.String,
  ...IssueDraft.fields,
  version: Schema.Number,
  comments: Schema.Array(Comment),
})

export const IssueRevision = Schema.Struct({
  version: Schema.Number,
  fields: IssueDraft,
})

export const RetainedIssueDraft = Schema.Struct({
  issueId: Schema.String,
  baseline: IssueRevision,
  draft: IssueDraft,
  commentBody: Schema.String,
})

const commentOrder = Order.combine(
  Order.mapInput(
    Option.makeOrder(DateTime.Order),
    (comment: typeof Comment.Type) => DateTime.make(comment.createdAt),
  ),
  Order.mapInput(Order.String, (comment: typeof Comment.Type) => comment.id),
)

export const mergeIssue = (
  current: typeof Issue.Type,
  incoming: typeof Issue.Type,
) => {
  const latest = incoming.version > current.version ? incoming : current
  const comments = Array.dedupeWith(
    [...current.comments, ...incoming.comments],
    (left, right) => left.id === right.id,
  )

  if (latest === current && comments.length === current.comments.length) {
    return current
  }

  return modifyFields(latest, {
    comments: () => Array.sort(comments, commentOrder),
  })
}

export const Project = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
})

export const Member = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  initials: Schema.String,
})

export const WorkspaceSnapshot = Schema.Struct({
  issues: Schema.Array(Issue),
  projects: Schema.Array(Project),
  members: Schema.Array(Member),
})

export const placeIssue = (
  issues: ReadonlyArray<typeof Issue.Type>,
  nextIssue: typeof Issue.Type,
  insertionIndex: number,
) => {
  const remaining = Array.filter(issues, issue => issue.id !== nextIssue.id)
  const targetIssues = Array.filter(
    remaining,
    issue =>
      issue.projectId === nextIssue.projectId &&
      issue.status === nextIssue.status,
  )
  const maybeBefore = Array.get(
    targetIssues,
    Math.max(0, Math.floor(insertionIndex)),
  )
  const maybeGlobalIndex = Option.flatMap(maybeBefore, before =>
    Array.findFirstIndex(remaining, issue => issue.id === before.id),
  )

  return Option.match(maybeGlobalIndex, {
    onNone: () => Array.append(remaining, nextIssue),
    onSome: index => [
      ...Array.take(remaining, index),
      nextIssue,
      ...Array.drop(remaining, index),
    ],
  })
}

export const placeIssueAt = (
  issues: ReadonlyArray<typeof Issue.Type>,
  issue: typeof Issue.Type,
  index: number,
) => {
  const remaining = Array.filter(issues, current => current.id !== issue.id)

  return [
    ...Array.take(remaining, index),
    issue,
    ...Array.drop(remaining, index),
  ]
}

export const moveIssue = (
  issues: ReadonlyArray<typeof Issue.Type>,
  issueId: string,
  status: typeof IssueStatus.Type,
  insertionIndex: number,
) =>
  Option.match(
    Array.findFirst(issues, issue => issue.id === issueId),
    {
      onNone: () => issues,
      onSome: issue =>
        placeIssue(
          issues,
          modifyFields(issue, { status: () => status }),
          insertionIndex,
        ),
    },
  )

export const NotificationKind = defineTaggedUnion({
  Commented: { body: Schema.String },
  Assigned: {},
})

export const Notification = Schema.Struct({
  id: Schema.String,
  recipientId: Schema.String,
  actorId: Schema.String,
  issueId: Schema.String,
  kind: NotificationKind,
  createdAt: Schema.String,
  isRead: Schema.Boolean,
})

export const NotificationActivity = defineTaggedUnion({
  Commented: { issue: Issue, comment: Comment },
  Assigned: { issue: Issue, actorId: Schema.String, createdAt: Schema.String },
})

export const makeNotifications = (activity: typeof NotificationActivity.Type) =>
  NotificationActivity.match(activity, {
    Commented: ({ issue, comment }) => {
      const recipientIds = Array.dedupe([
        ...Option.toArray(issue.maybeAssigneeId),
        ...Array.map(issue.comments, participant => participant.authorId),
      ])

      return Array.map(
        Array.filter(
          recipientIds,
          recipientId => recipientId !== comment.authorId,
        ),
        recipientId =>
          Notification.make({
            id: `comment:${comment.id}:${recipientId}`,
            recipientId,
            actorId: comment.authorId,
            issueId: issue.id,
            kind: NotificationKind.Commented({ body: comment.body }),
            createdAt: comment.createdAt,
            isRead: false,
          }),
      )
    },
    Assigned: ({ issue, actorId, createdAt }) =>
      Option.match(issue.maybeAssigneeId, {
        onNone: () => [],
        onSome: recipientId =>
          recipientId === actorId
            ? []
            : [
                Notification.make({
                  id: `assignment:${issue.id}:${issue.version}:${recipientId}`,
                  recipientId,
                  actorId,
                  issueId: issue.id,
                  kind: NotificationKind.Assigned(),
                  createdAt,
                  isRead: false,
                }),
              ],
      }),
  })
