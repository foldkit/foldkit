import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { makeFieldsStep, makeNoopStep, makeStep } from '../block'
import { NotificationCenterBinding } from '../composition'
import { Issue, Workspace } from '../domain'
import type { SucceededAssignIssue } from '../message'
import { maybeConfirmedIssue } from '../selectors'

const replaceIssue = (issue: Issue.Issue) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      Workspace.replaceIssue(workspace, issue),
    ),
  }))

export const mergeIssue = (incomingIssue: Issue.Issue) =>
  makeStep(model => {
    const maybeIssue = maybeConfirmedIssue(model, incomingIssue.id)

    if (Option.isNone(maybeIssue)) {
      return { model }
    }

    const previousIssue = maybeIssue.value
    const nextIssue = Issue.merge(previousIssue, incomingIssue)
    const newComments = Issue.commentsAddedSince(previousIssue, nextIssue)

    return Update.combineSteps([
      replaceIssue(nextIssue),
      ...Array.map(newComments, comment =>
        NotificationCenterBinding.informOfIssueComment({
          issue: nextIssue,
          comment,
        }),
      ),
    ])
  })

export const mergeIssueRevision = (saveResult: Issue.SaveResult) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      Workspace.mergeIssueRevision(workspace, saveResult),
    ),
  }))

export const recordIssueComment = (issueId: string, comment: Issue.Comment) =>
  makeStep(model => {
    const maybeIssue = maybeConfirmedIssue(model, issueId)

    if (Option.isNone(maybeIssue)) {
      return { model }
    }

    const issue = maybeIssue.value
    const isNewComment = !Issue.hasComment(issue, comment.id)

    return Update.combineSteps([
      makeFieldsStep(() => ({
        workspaceAsyncData: AsyncData.map(workspace =>
          Workspace.addIssueComment(workspace, issueId, comment),
        ),
      })),
      isNewComment
        ? NotificationCenterBinding.informOfIssueComment({ issue, comment })
        : makeNoopStep(),
    ])
  })

export const handleSucceededAssignIssue = makeStep(
  (model, { saveResult, actorId, createdAt }: SucceededAssignIssue) => {
    const clearActivityError = makeFieldsStep(() => ({
      maybeActivityError: () => Option.none(),
    }))
    const maybeIssue = maybeConfirmedIssue(model, saveResult.issueId)

    if (Option.isNone(maybeIssue)) {
      return clearActivityError
    }

    const previousIssue = maybeIssue.value
    const nextIssue = Issue.mergeRevision(previousIssue, saveResult.revision)

    return Update.combineSteps([
      replaceIssue(nextIssue),
      clearActivityError,
      Issue.hasNewAssignee(previousIssue, nextIssue)
        ? NotificationCenterBinding.informOfIssueAssignment({
            issue: nextIssue,
            actorId,
            createdAt,
          })
        : makeNoopStep(),
    ])
  },
)
