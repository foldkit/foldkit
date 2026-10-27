import { Array, DateTime, Option, Order } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  type Comment,
  type Issue,
  IssueDraft,
  IssueRevision,
  type MovedIssue,
  SavedIssue,
  type Workspace,
  placeIssue,
} from './domain'

const commentOrder = Order.combine(
  Order.mapInput(
    Option.makeOrder(DateTime.Order),
    (comment: typeof Comment.Type) => DateTime.make(comment.createdAt),
  ),
  Order.mapInput(Order.String, (comment: typeof Comment.Type) => comment.id),
)

export const mergeIssue = (
  currentIssue: typeof Issue.Type,
  incomingIssue: typeof Issue.Type,
) => {
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

export const draftFromIssue = (issue: typeof Issue.Type) =>
  IssueDraft.make({
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    projectId: issue.projectId,
    maybeAssigneeId: issue.maybeAssigneeId,
    labelIds: issue.labelIds,
  })

export const mergeIssues = (
  currentIssues: ReadonlyArray<typeof Issue.Type>,
  incomingIssues: ReadonlyArray<typeof Issue.Type>,
) => [
  ...Array.map(incomingIssues, incomingIssue =>
    Option.match(
      Array.findFirst(
        currentIssues,
        currentIssue => currentIssue.id === incomingIssue.id,
      ),
      {
        onNone: () => incomingIssue,
        onSome: currentIssue => mergeIssue(currentIssue, incomingIssue),
      },
    ),
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

export const revisionFromIssue = (issue: typeof Issue.Type) =>
  IssueRevision.make({ version: issue.version, fields: draftFromIssue(issue) })

export const savedIssueFromIssue = (issue: typeof Issue.Type) =>
  SavedIssue.make({
    issueId: issue.id,
    identifier: issue.identifier,
    revision: revisionFromIssue(issue),
  })

export const applySavedIssue = (
  workspace: typeof Workspace.Type,
  savedIssue: typeof SavedIssue.Type,
) =>
  modifyFields(workspace, {
    issues: Array.map(issue =>
      issue.id === savedIssue.issueId &&
      savedIssue.revision.version > issue.version
        ? modifyFields(issue, {
            title: () => savedIssue.revision.fields.title,
            description: () => savedIssue.revision.fields.description,
            status: () => savedIssue.revision.fields.status,
            priority: () => savedIssue.revision.fields.priority,
            projectId: () => savedIssue.revision.fields.projectId,
            maybeAssigneeId: () => savedIssue.revision.fields.maybeAssigneeId,
            labelIds: () => savedIssue.revision.fields.labelIds,
            version: () => savedIssue.revision.version,
          })
        : issue,
    ),
  })

export const applyComment = (
  workspace: typeof Workspace.Type,
  issueId: string,
  comment: typeof Comment.Type,
) =>
  modifyFields(workspace, {
    issues: Array.map(issue =>
      issue.id === issueId &&
      !Array.some(
        issue.comments,
        previousComment => previousComment.id === comment.id,
      )
        ? modifyFields(issue, {
            comments: comments =>
              Array.sort(Array.append(comments, comment), commentOrder),
          })
        : issue,
    ),
  })

export const applyMovedIssue = (
  workspace: typeof Workspace.Type,
  movedIssue: typeof MovedIssue.Type,
) =>
  modifyFields(workspace, {
    issues: issues =>
      Option.match(
        Array.findFirst(issues, issue => issue.id === movedIssue.issueId),
        {
          onNone: () => issues,
          onSome: issue =>
            issue.version > movedIssue.version
              ? issues
              : placeIssue(
                  issues,
                  modifyFields(issue, {
                    status: () => movedIssue.status,
                    version: () => movedIssue.version,
                  }),
                  movedIssue.insertionIndex,
                ),
        },
      ),
  })
