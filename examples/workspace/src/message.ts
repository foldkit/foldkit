import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Issue, IssueStatus, WorkspaceSnapshot } from './domain'
import { RepositoryError } from './repository'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedReplaceInternalUrl: {},
  SucceededLoadWorkspace: { snapshot: WorkspaceSnapshot },
  FailedLoadWorkspace: { error: Schema.String },
  ClickedRetryLoad: {},
  ClickedSimulateSaveFailure: {},
  CompletedSimulateSaveFailure: {},
  ClickedOpenCommandPalette: {},
  ClickedDeleteSavedView: { viewId: Schema.String },
  TickedActivityStream: {},
  ClickedSimulateActivity: {},
  SucceededAppendActivity: { issue: Issue },
  FailedAppendActivity: { error: Schema.String },
  SucceededAssignIssue: {
    issue: Issue,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
  FailedAssignIssue: { error: Schema.String },
  SucceededMoveIssue: { snapshot: WorkspaceSnapshot },
  FailedMoveIssue: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: RepositoryError,
  },
  ClickedRetryMove: {},
})
