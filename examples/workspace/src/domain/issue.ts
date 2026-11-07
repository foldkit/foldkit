import { Array, DateTime, Option, Order, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

export const Status = Schema.Literals(['Backlog', 'Todo', 'InProgress', 'Done'])
export type Status = typeof Status.Type

export const statusLabel = (status: Status) =>
  status === 'InProgress' ? 'In progress' : status

export const Priority = Schema.Literals(['Low', 'Medium', 'High'])
export type Priority = typeof Priority.Type

export const GroupBy = Schema.Literals(['None', 'Status', 'Project'])
export type GroupBy = typeof GroupBy.Type

export const SortBy = Schema.Literals(['Identifier', 'Priority'])
export type SortBy = typeof SortBy.Type

export const Filters = Schema.Struct({
  query: Schema.String,
  maybeStatus: Schema.Option(Status),
  sort: SortBy,
  groupBy: GroupBy,
})
export type Filters = typeof Filters.Type

export const Comment = Schema.Struct({
  id: Schema.String,
  authorId: Schema.String,
  body: Schema.String,
  createdAt: Schema.String,
})
export type Comment = typeof Comment.Type

export const Draft = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  status: Status,
  priority: Priority,
  projectId: Schema.String,
  maybeAssigneeId: Schema.Option(Schema.String),
  labelIds: Schema.Array(Schema.String),
})
export type Draft = typeof Draft.Type

export const Issue = Schema.Struct({
  id: Schema.String,
  identifier: Schema.String,
  ...Draft.fields,
  version: Schema.Number,
  comments: Schema.Array(Comment),
})
export type Issue = typeof Issue.Type

export const Revision = Schema.Struct({
  version: Schema.Number,
  fields: Draft,
})
export type Revision = typeof Revision.Type

export const SaveResult = Schema.Struct({
  issueId: Schema.String,
  identifier: Schema.String,
  revision: Revision,
})
export type SaveResult = typeof SaveResult.Type

export const MoveResult = Schema.Struct({
  issueId: Schema.String,
  status: Status,
  insertionIndex: Schema.Number,
  version: Schema.Number,
})
export type MoveResult = typeof MoveResult.Type

export const MoveState = defineTaggedUnion({
  Idle: {},
  Moving: {
    issueId: Schema.String,
    status: Status,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  Failed: {
    issueId: Schema.String,
    status: Status,
    insertionIndex: Schema.Number,
    error: Schema.String,
  },
})
export type MoveState = typeof MoveState.Type

export const findById = (issues: ReadonlyArray<Issue>, issueId: string) =>
  Array.findFirst(issues, issue => issue.id === issueId)

export const hasComment = (issue: Issue, commentId: string) =>
  Array.some(issue.comments, comment => comment.id === commentId)

export const hasNewAssignee = (previousIssue: Issue, nextIssue: Issue) => {
  const { maybeAssigneeId } = nextIssue

  if (Option.isNone(maybeAssigneeId)) {
    return false
  }

  return !Option.contains(previousIssue.maybeAssigneeId, maybeAssigneeId.value)
}

export const commentsAddedSince = (previousIssue: Issue, nextIssue: Issue) =>
  Array.filter(
    nextIssue.comments,
    comment => !hasComment(previousIssue, comment.id),
  )

export const forProject = (issues: ReadonlyArray<Issue>, projectId: string) =>
  Array.filter(issues, issue => issue.projectId === projectId)

export const forStatus = (issues: ReadonlyArray<Issue>, status: Status) =>
  Array.filter(issues, issue => issue.status === status)

export const assignedTo = (issues: ReadonlyArray<Issue>, memberId: string) =>
  Array.filter(issues, issue =>
    Option.contains(issue.maybeAssigneeId, memberId),
  )

export const involvingMember = (
  issues: ReadonlyArray<Issue>,
  memberId: string,
) =>
  Array.filter(
    issues,
    issue =>
      Option.contains(issue.maybeAssigneeId, memberId) ||
      Array.some(issue.comments, comment => comment.authorId === memberId),
  )

export const place = (
  issues: ReadonlyArray<Issue>,
  nextIssue: Issue,
  insertionIndex: number,
) => {
  const remainingIssues = Array.filter(
    issues,
    issue => issue.id !== nextIssue.id,
  )
  const issuesInTargetStatus = forStatus(
    forProject(remainingIssues, nextIssue.projectId),
    nextIssue.status,
  )
  const requestedInsertionIndex = Math.max(0, Math.floor(insertionIndex))
  const maybeFollowingIssue = Array.get(
    issuesInTargetStatus,
    requestedInsertionIndex,
  )
  const maybeWorkspaceInsertionIndex = Option.flatMap(
    maybeFollowingIssue,
    followingIssue =>
      Array.findFirstIndex(
        remainingIssues,
        issue => issue.id === followingIssue.id,
      ),
  )

  return {
    issues: Option.match(maybeWorkspaceInsertionIndex, {
      onNone: () => Array.append(remainingIssues, nextIssue),
      onSome: index => [
        ...Array.take(remainingIssues, index),
        nextIssue,
        ...Array.drop(remainingIssues, index),
      ],
    }),
    insertionIndex: Option.isSome(maybeFollowingIssue)
      ? requestedInsertionIndex
      : issuesInTargetStatus.length,
  }
}

export const move = (
  issues: ReadonlyArray<Issue>,
  issueId: string,
  status: Status,
  insertionIndex: number,
) =>
  Option.match(findById(issues, issueId), {
    onNone: () => issues,
    onSome: issue =>
      place(
        issues,
        modifyFields(issue, { status: () => status }),
        insertionIndex,
      ).issues,
  })

const commentOrder = Order.combine(
  Order.mapInput(Option.makeOrder(DateTime.Order), (comment: Comment) =>
    DateTime.make(comment.createdAt),
  ),
  Order.mapInput(Order.String, (comment: Comment) => comment.id),
)

export const addComment = (issue: Issue, comment: Comment) =>
  hasComment(issue, comment.id)
    ? issue
    : modifyFields(issue, {
        comments: comments =>
          Array.sort(Array.append(comments, comment), commentOrder),
      })

export const merge = (currentIssue: Issue, incomingIssue: Issue) => {
  const latestIssue =
    incomingIssue.version > currentIssue.version ? incomingIssue : currentIssue
  const mergedComments = Array.dedupeWith(
    [...currentIssue.comments, ...incomingIssue.comments],
    (left, right) => left.id === right.id,
  )

  if (
    latestIssue === currentIssue &&
    mergedComments.length === currentIssue.comments.length
  ) {
    return currentIssue
  }

  return modifyFields(latestIssue, {
    comments: () => Array.sort(mergedComments, commentOrder),
  })
}

export const mergeRevision = (issue: Issue, revision: Revision) => {
  if (revision.version <= issue.version) {
    return issue
  }

  return Issue.make({
    ...issue,
    ...revision.fields,
    version: revision.version,
  })
}

export const toDraft = (issue: Issue) =>
  Draft.make({
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId,
    maybeAssigneeId: issue.maybeAssigneeId,
    labelIds: issue.labelIds,
  })

export const mergeAll = (
  currentIssues: ReadonlyArray<Issue>,
  incomingIssues: ReadonlyArray<Issue>,
) => [
  ...Array.map(incomingIssues, incomingIssue =>
    Option.match(findById(currentIssues, incomingIssue.id), {
      onNone: () => incomingIssue,
      onSome: currentIssue => merge(currentIssue, incomingIssue),
    }),
  ),
  ...Array.filter(
    currentIssues,
    currentIssue =>
      !Array.some(
        incomingIssues,
        incomingIssue => incomingIssue.id === currentIssue.id,
      ),
  ),
]

export const toRevision = (issue: Issue) =>
  Revision.make({ version: issue.version, fields: toDraft(issue) })

export const toSaveResult = (issue: Issue) =>
  SaveResult.make({
    issueId: issue.id,
    identifier: issue.identifier,
    revision: toRevision(issue),
  })
