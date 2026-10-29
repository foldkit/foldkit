import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { NotificationCenterBinding } from '../composition'
import { makeFieldsStep, makeNoopStep, makeStep } from '../definition'
import {
  type Comment,
  type Issue,
  NotificationActivity,
  type SavedIssue,
  applyComment,
  applySavedIssue,
  mergeIssue,
} from '../domain'

const notifyNewCommentsStep = (issue: Issue) =>
  makeStep(model => {
    const maybePreviousIssue = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      workspace =>
        Array.findFirst(
          workspace.issues,
          previousIssue => previousIssue.id === issue.id,
        ),
    )

    if (Option.isNone(maybePreviousIssue)) {
      return makeNoopStep()
    }

    const newComments = Array.filter(
      issue.comments,
      comment =>
        !Array.some(
          maybePreviousIssue.value.comments,
          previousComment => previousComment.id === comment.id,
        ),
    )

    return Update.combineSteps(
      Array.map(newComments, comment =>
        NotificationCenterBinding.informActivity({
          activity: NotificationActivity.Commented({ issue, comment }),
        }),
      ),
    )
  })

export const applyIssueSnapshotStep = (issue: Issue) =>
  Update.combineSteps([
    notifyNewCommentsStep(issue),
    makeFieldsStep(() => ({
      workspaceAsyncData: AsyncData.map(workspace =>
        modifyFields(workspace, {
          issues: Array.map(currentIssue =>
            currentIssue.id === issue.id
              ? mergeIssue(currentIssue, issue)
              : currentIssue,
          ),
        }),
      ),
    })),
  ])

export const applySavedIssueStep = (savedIssue: SavedIssue) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      applySavedIssue(workspace, savedIssue),
    ),
  }))

export const applyIssueCommentStep = (issueId: string, comment: Comment) =>
  makeStep(model => {
    const maybeIssue = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      workspace =>
        Array.findFirst(workspace.issues, issue => issue.id === issueId),
    )

    if (Option.isNone(maybeIssue)) {
      return { model }
    }

    const issue = maybeIssue.value
    const isNewComment = !Array.some(
      issue.comments,
      previousComment => previousComment.id === comment.id,
    )

    return Update.combineSteps([
      makeFieldsStep(() => ({
        workspaceAsyncData: AsyncData.map(workspace =>
          applyComment(workspace, issueId, comment),
        ),
      })),
      isNewComment
        ? NotificationCenterBinding.informActivity({
            activity: NotificationActivity.Commented({ issue, comment }),
          })
        : makeNoopStep(),
    ])
  })
