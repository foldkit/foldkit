import { Array, Option, Schema } from 'effect'
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
import {
  ApplicationRoute,
  defaultIssueFilters,
  pageRoute,
  routeFilters,
} from './route'

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
  workspaceAsyncData: WorkspaceAsyncData.schema,
  issueList: IssueListBlock.Model,
  createIssue: CreateIssueBlock.Model,
  boardInstances: Schema.Array(BoardInstance),
  commandPalette: CommandPaletteBlock.Model,
  memberDirectory: MemberDirectoryBlock.Model,
  notificationCenter: NotificationCenterBlock.Model,
  issueDetailInstances: Schema.Array(IssueDetailInstance),
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

export const maybeActiveIssueDetailInstance = (model: typeof Model.Type) => {
  const route = model.route

  return ApplicationRoute.guards.Issue(route)
    ? Array.findFirst(
        model.issueDetailInstances,
        instance => instance.issueId === route.issueId,
      )
    : Option.none()
}

export const maybeActiveBoardInstance = (model: typeof Model.Type) => {
  const route = pageRoute(model.route)

  return ApplicationRoute.guards.Board(route)
    ? Array.findFirst(
        model.boardInstances,
        instance => instance.projectId === route.projectId,
      )
    : Option.none()
}

export const appliedIssueFilters = (model: typeof Model.Type) => {
  const route = pageRoute(model.route)

  return Option.getOrElse(routeFilters(route), () => {
    if (ApplicationRoute.guards.SavedView(route)) {
      return Option.match(
        Array.findFirst(model.savedViews, view => view.id === route.viewId),
        {
          onNone: () => defaultIssueFilters,
          onSome: view => view.filters,
        },
      )
    }

    return defaultIssueFilters
  })
}
