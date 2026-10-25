import { Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

import { IssueBoardBlock } from './board'
import { CommandPaletteBlock } from './commandPalette'
import { CreateIssueBlock } from './createIssue'
import {
  IssueStatus,
  RetainedIssueDraft,
  SavedView,
  WorkspaceSnapshot,
} from './domain'
import { IssueDetailBlock } from './issueDetail'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { MemberDirectoryBlock } from './memberDirectory'
import { NotificationCenterBlock } from './notifications'
import { ProjectSettingsBlock } from './projectSettings'
import { ApplicationRoute, IssueCloseRoute } from './route'

export const WorkspaceAsyncData = AsyncData.Schema(
  WorkspaceSnapshot,
  Schema.String,
)

export const IssueDetailInstance = Schema.Struct({
  issueId: Schema.String,
  model: IssueDetailBlock.Model,
})

export const BoardInstance = Schema.Struct({
  projectId: Schema.String,
  model: IssueBoardBlock.Model,
})

export const ProjectSettingsInstance = Schema.Struct({
  projectId: Schema.String,
  model: ProjectSettingsBlock.Model,
})

export const IssueMoveState = defineTaggedUnion({
  Idle: {},
  MovingIssue: {
    issueId: Schema.String,
    previousStatus: IssueStatus,
    previousIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  FailedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: Schema.String,
  },
})

export const Model = Schema.Struct({
  route: ApplicationRoute,
  issueCloseRoute: IssueCloseRoute,
  workspaceAsyncData: WorkspaceAsyncData.schema,
  issueList: IssueListBlock.Model,
  createIssue: CreateIssueBlock.Model,
  maybeBoardInstance: Schema.Option(BoardInstance),
  commandPalette: CommandPaletteBlock.Model,
  memberDirectory: MemberDirectoryBlock.Model,
  notificationCenter: NotificationCenterBlock.Model,
  maybeIssueDetailInstance: Schema.Option(IssueDetailInstance),
  issueDrafts: Schema.Array(RetainedIssueDraft),
  maybeNotice: Schema.Option(Schema.String),
  maybeActivityError: Schema.Option(Schema.String),
  activeMemberId: Schema.String,
  activeMemberListbox: WorkspaceListboxBlock.Model,
  activityTick: Schema.Number,
  savedViews: Schema.Array(SavedView),
  nextSavedViewId: Schema.Number,
  projectSettingsInstances: Schema.Array(ProjectSettingsInstance),
  issueMoveState: IssueMoveState,
})
