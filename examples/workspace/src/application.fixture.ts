import { Array, Layer, Option, Record } from 'effect'
import { AsyncData, Block } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { message } from 'foldkit/story'
import * as Url from 'foldkit/url'

import { ApplicationLive, Message, type Model } from './application'
import { initialWorkspace } from './domain/seed'
import { IssueBoard } from './issueBoard'
import { CommentComposer } from './issueDetail/commentComposer'
import { IssueDetail, maybeDraftSummary } from './issueDetail/issueDetail'
import { IssueList } from './issueList'
import { IssueMove, workspaceWithPendingMove } from './issueMove'
import { WorkspaceListbox } from './listbox'
import { NotificationCenter } from './notificationCenter'
import { ProjectSettings } from './projectSettings'
import { ApplicationRoute, maybeIssueId } from './route'
import { ApplicationLayer } from './services'
import { TeammateActivity } from './teammateActivity'

export type ResolvedModel = Resolved<Model>

export const application = ApplicationLive.pipe(Layer.provide(ApplicationLayer))

export const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

export const startAt = (path = '/') => ({ url: url(path) })

export const loadWorkspace = message(
  Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
)

export const issueDetailMessage = (
  issueId: string,
  childMessage: typeof IssueDetail.Message.Type,
) =>
  Block.deliver(
    IssueDetail,
    ['issuePane', 'issueDetails', issueId],
    childMessage,
  )

export const commentComposerMessage = (
  issueId: string,
  childMessage: typeof CommentComposer.Message.Type,
) =>
  Block.deliver(
    CommentComposer,
    ['issuePane', 'issueDetails', issueId, 'commentComposer'],
    childMessage,
  )

export const projectSettingsMessage = (
  projectId: string,
  childMessage: typeof ProjectSettings.Message.Type,
) =>
  Block.deliver(ProjectSettings, ['projectSettings', projectId], childMessage)

export const issueBoardMessage = (
  projectId: string,
  childMessage: typeof IssueBoard.Message.Type,
) => Block.deliver(IssueBoard, ['issueBoards', projectId], childMessage)

export const issueListMessage = (childMessage: typeof IssueList.Message.Type) =>
  Block.deliver(IssueList, 'issueList', childMessage)

export const notificationMessage = (
  childMessage: typeof NotificationCenter.Message.Type,
) => Block.deliver(NotificationCenter, 'notificationCenter', childMessage)

export const issueMoveMessage = (childMessage: typeof IssueMove.Message.Type) =>
  Block.deliver(IssueMove, 'issueMove', childMessage)

export const teammateActivityMessage = (
  childMessage: typeof TeammateActivity.Message.Type,
) => Block.deliver(TeammateActivity, 'teammateActivity', childMessage)

export const activeMemberMessage = (memberId: string) =>
  Block.deliver(
    WorkspaceListbox,
    ['memberSwitcher', 'activeMemberListbox'],
    WorkspaceListbox.Message.RequestedSelectItem({ item: memberId }),
  )

export const retainedIssueDetail = (model: ResolvedModel, issueId: string) =>
  Option.getOrThrow(Record.get(model.issuePane.issueDetails, issueId))

export const maybeActiveIssueDetail = (model: ResolvedModel) =>
  Option.flatMap(maybeIssueId(model.route), issueId =>
    Record.get(model.issuePane.issueDetails, issueId),
  )

export const activeIssueDetail = (model: ResolvedModel) =>
  Option.getOrThrow(maybeActiveIssueDetail(model))

export const activeIssueBoard = (model: ResolvedModel) => {
  const { route } = model

  return Option.getOrThrow(
    ApplicationRoute.guards.Board(route)
      ? Record.get(model.issueBoards, route.projectId)
      : Option.none(),
  )
}

export const projectSettingsForm = (model: ResolvedModel, projectId: string) =>
  Option.getOrThrow(Record.get(model.projectSettings, projectId))

export const unsavedIssueDrafts = (model: ResolvedModel) =>
  Array.getSomes(
    Array.map(Record.values(model.issuePane.issueDetails), detail =>
      maybeDraftSummary(detail, detail.commentComposer),
    ),
  )

export const visibleWorkspaceOf = (model: ResolvedModel) =>
  workspaceWithPendingMove(
    Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData)),
    model.issueMove.state,
  )

export const visibleNotifications = (model: ResolvedModel) =>
  Array.filter(
    model.notificationCenter.notifications,
    notification =>
      notification.recipientId === model.memberSwitcher.activeMemberId,
  )
