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
  Order.mapInput(Option.makeOrder(DateTime.Order), (comment: Comment) =>
    DateTime.make(comment.createdAt),
  ),
  Order.mapInput(Order.String, (comment: Comment) => comment.id),
)

export const mergeIssue = (currentIssue: Issue, incomingIssue: Issue) => {
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

export const draftFromIssue = (issue: Issue) =>
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
  currentIssues: ReadonlyArray<Issue>,
  incomingIssues: ReadonlyArray<Issue>,
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

export const revisionFromIssue = (issue: Issue) =>
  IssueRevision.make({ version: issue.version, fields: draftFromIssue(issue) })

export const savedIssueFromIssue = (issue: Issue) =>
  SavedIssue.make({
    issueId: issue.id,
    identifier: issue.identifier,
    revision: revisionFromIssue(issue),
  })

export const applySavedIssue = (workspace: Workspace, savedIssue: SavedIssue) =>
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
  workspace: Workspace,
  issueId: string,
  comment: Comment,
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

export const applyMovedIssue = (workspace: Workspace, movedIssue: MovedIssue) =>
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
