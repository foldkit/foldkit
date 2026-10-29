import { Array, Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

export const IssueStatus = Schema.Literals([
  'Backlog',
  'Todo',
  'InProgress',
  'Done',
])
export type IssueStatus = typeof IssueStatus.Type

export const issueStatusLabel = (status: IssueStatus) =>
  status === 'InProgress' ? 'In progress' : status

export const IssuePriority = Schema.Literals(['Low', 'Medium', 'High'])
export type IssuePriority = typeof IssuePriority.Type

export const GroupBy = Schema.Literals(['None', 'Status', 'Project'])
export type GroupBy = typeof GroupBy.Type

export const IssueFilters = Schema.Struct({
  query: Schema.String,
  maybeStatus: Schema.Option(IssueStatus),
  sort: Schema.Literals(['Identifier', 'Priority']),
  groupBy: GroupBy,
})
export type IssueFilters = typeof IssueFilters.Type

export const SavedView = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  filters: IssueFilters,
})
export type SavedView = typeof SavedView.Type

export const Comment = Schema.Struct({
  id: Schema.String,
  authorId: Schema.String,
  body: Schema.String,
  createdAt: Schema.String,
})
export type Comment = typeof Comment.Type

export const IssueDraft = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  status: IssueStatus,
  priority: IssuePriority,
  projectId: Schema.String,
  maybeAssigneeId: Schema.Option(Schema.String),
  labelIds: Schema.Array(Schema.String),
})
export type IssueDraft = typeof IssueDraft.Type

export const Issue = Schema.Struct({
  id: Schema.String,
  identifier: Schema.String,
  ...IssueDraft.fields,
  version: Schema.Number,
  comments: Schema.Array(Comment),
})
export type Issue = typeof Issue.Type

export const IssueRevision = Schema.Struct({
  version: Schema.Number,
  fields: IssueDraft,
})
export type IssueRevision = typeof IssueRevision.Type

export const SavedIssue = Schema.Struct({
  issueId: Schema.String,
  identifier: Schema.String,
  revision: IssueRevision,
})
export type SavedIssue = typeof SavedIssue.Type

export const MovedIssue = Schema.Struct({
  issueId: Schema.String,
  status: IssueStatus,
  insertionIndex: Schema.Number,
  version: Schema.Number,
})
export type MovedIssue = typeof MovedIssue.Type

export const Project = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  description: Schema.String,
})
export type Project = typeof Project.Type

export const Member = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  initials: Schema.String,
})
export type Member = typeof Member.Type

export const Workspace = Schema.Struct({
  issues: Schema.Array(Issue),
  projects: Schema.Array(Project),
  members: Schema.Array(Member),
})
export type Workspace = typeof Workspace.Type

export const placeIssue = (
  issues: ReadonlyArray<Issue>,
  nextIssue: Issue,
  insertionIndex: number,
) => {
  const remainingIssues = Array.filter(
    issues,
    issue => issue.id !== nextIssue.id,
  )
  const targetIssues = Array.filter(
    remainingIssues,
    issue =>
      issue.projectId === nextIssue.projectId &&
      issue.status === nextIssue.status,
  )
  const maybeFollowingIssue = Array.get(
    targetIssues,
    Math.max(0, Math.floor(insertionIndex)),
  )
  const maybeWorkspaceInsertionIndex = Option.flatMap(
    maybeFollowingIssue,
    followingIssue =>
      Array.findFirstIndex(
        remainingIssues,
        issue => issue.id === followingIssue.id,
      ),
  )

  return Option.match(maybeWorkspaceInsertionIndex, {
    onNone: () => Array.append(remainingIssues, nextIssue),
    onSome: index => [
      ...Array.take(remainingIssues, index),
      nextIssue,
      ...Array.drop(remainingIssues, index),
    ],
  })
}

export const moveIssue = (
  issues: ReadonlyArray<Issue>,
  issueId: string,
  status: IssueStatus,
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
export type NotificationKind = typeof NotificationKind.Type

export const Notification = Schema.Struct({
  id: Schema.String,
  recipientId: Schema.String,
  actorId: Schema.String,
  issueId: Schema.String,
  kind: NotificationKind,
  createdAt: Schema.String,
  isRead: Schema.Boolean,
})
export type Notification = typeof Notification.Type

export const NotificationActivity = defineTaggedUnion({
  Commented: { issue: Issue, comment: Comment },
  Assigned: { issue: Issue, actorId: Schema.String, createdAt: Schema.String },
})
export type NotificationActivity = typeof NotificationActivity.Type

export const makeNotifications = (activity: NotificationActivity) =>
  NotificationActivity.match(activity, {
    Commented: ({ issue, comment }) => {
      const recipientIds = Array.dedupe([
        ...Option.toArray(issue.maybeAssigneeId),
        ...Array.map(issue.comments, issueComment => issueComment.authorId),
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
