import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import { CommandPaletteBlock } from './commandPalette'
import { CreateIssueBlock } from './createIssue'
import { SavedView, Workspace } from './domain'
import { IssueBoardBlock } from './issueBoard'
import { IssueDetailBlock } from './issueDetail'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { MemberDirectoryBlock } from './memberDirectory'
import { NotificationCenterBlock } from './notificationCenter'
import { IssueMoveState } from './optimistic'
import { ProjectSettingsBlock } from './projectSettings'
import { ApplicationRoute } from './route'

export const WorkspaceAsyncData = AsyncData.Schema(Workspace, Schema.String)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  workspaceAsyncData: WorkspaceAsyncData.schema,
  issueList: IssueListBlock.Model,
  createIssue: CreateIssueBlock.Model,
  issueBoards: Schema.Record(Schema.String, IssueBoardBlock.Model),
  commandPalette: CommandPaletteBlock.Model,
  memberDirectory: MemberDirectoryBlock.Model,
  notificationCenter: NotificationCenterBlock.Model,
  issueDetails: Schema.Record(Schema.String, IssueDetailBlock.Model),
  maybeNotice: Schema.Option(Schema.String),
  maybeActivityError: Schema.Option(Schema.String),
  activeMemberId: Schema.String,
  activeMemberListbox: WorkspaceListboxBlock.Model,
  activityTick: Schema.Number,
  savedViews: Schema.Array(SavedView),
  nextSavedViewId: Schema.Number,
  projectSettings: Schema.Record(Schema.String, ProjectSettingsBlock.Model),
  issueMoveState: IssueMoveState,
})
export type Model = typeof Model.Type
