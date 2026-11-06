import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Issue, Workspace } from './domain'
import { RepositoryError } from './repository'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedReplaceInternalUrl: {},
  SucceededLoadWorkspace: { workspace: Workspace.Workspace },
  FailedLoadWorkspace: { error: Schema.String },
  ClickedRetryLoad: {},
  ClickedSimulateSaveFailure: {},
  CompletedFailNextIssueSave: {},
  ClickedOpenCommandPalette: {},
  ClickedDeleteSavedView: { viewId: Schema.String },
  TickedActivityStream: {},
  ClickedSimulateActivity: {},
  SucceededAddIssueComment: { issueId: Schema.String, comment: Issue.Comment },
  FailedAddIssueComment: { error: Schema.String },
  SucceededAssignIssue: {
    saveResult: Issue.SaveResult,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
  FailedAssignIssue: { error: Schema.String },
  SucceededMoveIssue: { moveResult: Issue.MoveResult },
  FailedMoveIssue: {
    issueId: Schema.String,
    status: Issue.Status,
    insertionIndex: Schema.Number,
    error: RepositoryError,
  },
  ClickedRetryMove: {},
})
export type Message = typeof Message.Type
export type ChangedUrl = typeof Message.ChangedUrl.Type
export type ClickedDeleteSavedView = typeof Message.ClickedDeleteSavedView.Type
export type SucceededAssignIssue = typeof Message.SucceededAssignIssue.Type
export type SucceededMoveIssue = typeof Message.SucceededMoveIssue.Type
export type FailedMoveIssue = typeof Message.FailedMoveIssue.Type
