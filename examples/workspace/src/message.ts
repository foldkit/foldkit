import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import {
  Comment,
  IssueStatus,
  MovedIssue,
  SavedIssue,
  Workspace,
} from './domain'
import { RepositoryError } from './repository'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedReplaceInternalUrl: {},
  SucceededLoadWorkspace: { workspace: Workspace },
  FailedLoadWorkspace: { error: Schema.String },
  ClickedRetryLoad: {},
  ClickedSimulateSaveFailure: {},
  CompletedSimulateSaveFailure: {},
  ClickedOpenCommandPalette: {},
  ClickedDeleteSavedView: { viewId: Schema.String },
  TickedActivityStream: {},
  ClickedSimulateActivity: {},
  SucceededAppendActivity: { issueId: Schema.String, comment: Comment },
  FailedAppendActivity: { error: Schema.String },
  SucceededAssignIssue: {
    savedIssue: SavedIssue,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
  FailedAssignIssue: { error: Schema.String },
  SucceededMoveIssue: { movedIssue: MovedIssue },
  FailedMoveIssue: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: RepositoryError,
  },
  ClickedRetryMove: {},
})
export type Message = typeof Message.Type
export type ChangedUrl = typeof Message.ChangedUrl.Type
export type ClickedDeleteSavedView = typeof Message.ClickedDeleteSavedView.Type
