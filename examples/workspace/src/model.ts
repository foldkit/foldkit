import { Schema } from 'effect'
import { AsyncData } from 'foldkit'

import {
  CommandPaletteBlock,
  CreateIssueBlock,
  IssueBoardBlock,
  IssueDetailBlock,
  IssueListBlock,
  MemberDirectoryBlock,
  NotificationCenterBlock,
  ProjectSettingsBlock,
} from './blocks'
import { Issue, SavedView, Workspace } from './domain'
import { StringListboxBlock } from './listbox'
import { ApplicationRoute } from './route'

export const WorkspaceAsyncData = AsyncData.Schema(
  Workspace.Workspace,
  Schema.String,
)

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
  activeMemberListbox: StringListboxBlock.Model,
  activityRequestCount: Schema.Number,
  savedViews: Schema.Array(SavedView.SavedView),
  nextSavedViewNumber: Schema.Number,
  projectSettings: Schema.Record(Schema.String, ProjectSettingsBlock.Model),
  issueMoveState: Issue.MoveState,
})
export type Model = typeof Model.Type
