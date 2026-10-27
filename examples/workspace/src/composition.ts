import { Array, Number, Option } from 'effect'
import { AsyncData, type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { MoveIssue, NavigateInternal, ReplaceInternalUrl } from './command'
import { CommandPaletteBlock } from './commandPalette'
import { CreateIssueBlock } from './createIssue'
import {
  makeBinding,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeMapBinding,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} from './definition'
import {
  type Issue,
  type IssueFilters,
  type IssueStatus,
  NotificationActivity,
  SavedView,
  mergeIssue,
  moveIssue,
} from './domain'
import { IssueBoardBlock } from './issueBoard'
import { IssueDetailBlock } from './issueDetail'
import { issueFiltersHref, issueHref } from './issueLinks'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { MemberDirectoryBlock } from './memberDirectory'
import { IssueMoveState } from './model'
import { NotificationCenterBlock } from './notificationCenter'
import { ProjectSettingsBlock } from './projectSettings'
import {
  ApplicationRoute,
  isPageRoute,
  issuesRouter,
  maybeProjectId,
  projectRouter,
  routeToPath,
  withoutIssueId,
} from './route'
import { appliedIssueFilters } from './selection'

export const ActiveMemberBinding = makeBinding(WorkspaceListboxBlock, {
  field: 'activeMemberListbox',
  init: { contextToArgs: () => [{ id: 'workspace-active-member' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeMemberId: () => value })),
  }),
})

export const IssueDetailBinding = makeMapBinding(IssueDetailBlock, {
  field: 'issueDetails',
})

const openIssueStep = (issueId: string) =>
  makeCommandsStep(model => [
    NavigateInternal({ url: issueHref(model, issueId) }),
  ])

export const CreateIssueBinding = makeBinding(CreateIssueBlock, {
  field: 'createIssue',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(CreateIssueBlock, {
    Created: ({ issue }) =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(workspace =>
            modifyFields(workspace, {
              issues: Array.append(issue),
            }),
          ),
          maybeNotice: () => Option.some(`${issue.identifier} created`),
        })),
        openIssueStep(issue.id),
      ]),
  }),
})

export const NotificationCenterBinding = makeBinding(NotificationCenterBlock, {
  field: 'notificationCenter',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(NotificationCenterBlock, {
    SelectedIssue: ({ issueId }) => openIssueStep(issueId),
  }),
})

const notifyNewCommentsStep = (issue: typeof Issue.Type) =>
  makeStep(model => {
    const maybePreviousIssue = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      workspace =>
        Array.findFirst(workspace.issues, previous => previous.id === issue.id),
    )

    if (Option.isNone(maybePreviousIssue)) {
      return makeNoopStep()
    }

    const newComments = Array.filter(
      issue.comments,
      comment =>
        !Array.some(
          maybePreviousIssue.value.comments,
          previous => previous.id === comment.id,
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

export const updateWorkspaceIssueStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    notifyNewCommentsStep(issue),
    makeFieldsStep(() => ({
      workspaceAsyncData: AsyncData.map(workspace =>
        modifyFields(workspace, {
          issues: Array.map(current =>
            current.id === issue.id ? mergeIssue(current, issue) : current,
          ),
        }),
      ),
    })),
  ])

const foldIssueDetailOutMessage = makeOutMessageFold(IssueDetailBlock, {
  Saved: ({ issue }) =>
    Update.combineSteps([
      updateWorkspaceIssueStep(issue),
      makeFieldsStep(() => ({
        maybeNotice: () => Option.some(`${issue.identifier} saved`),
      })),
    ]),
  ReceivedIssue: ({ issue }) => updateWorkspaceIssueStep(issue),
  Closed: () =>
    makeCommandsStep(model => {
      const { route } = model

      if (ApplicationRoute.guards.Issue(route)) {
        return [NavigateInternal({ url: issuesRouter({}) })]
      }

      if (!isPageRoute(route)) {
        return []
      }

      return [NavigateInternal({ url: routeToPath(withoutIssueId(route)) })]
    }),
})

const navigateIssueFiltersStep = (
  change: (filters: typeof IssueFilters.Type) => typeof IssueFilters.Type,
) =>
  makeCommandsStep(model => [
    NavigateInternal({
      url: issueFiltersHref(model, change(appliedIssueFilters(model))),
    }),
  ])

export const IssueListBinding = makeBinding(IssueListBlock, {
  field: 'issueList',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(IssueListBlock, {
    SavedFilter: ({ name, filters }) =>
      makeFieldsStep(model => ({
        savedViews: Array.append(
          SavedView.make({
            id: `view-${model.nextSavedViewId}`,
            name,
            filters,
          }),
        ),
        nextSavedViewId: Number.increment,
        maybeNotice: () => Option.some(`Saved view “${name}”`),
      })),
    ChangedQuery: ({ query }) =>
      makeCommandsStep(model => [
        ReplaceInternalUrl({
          url: issueFiltersHref(
            model,
            modifyFields(appliedIssueFilters(model), { query: () => query }),
          ),
        }),
      ]),
    ChangedStatusFilter: ({ maybeStatus }) =>
      navigateIssueFiltersStep(filters =>
        modifyFields(filters, { maybeStatus: () => maybeStatus }),
      ),
    ChangedSort: ({ sort }) =>
      navigateIssueFiltersStep(filters =>
        modifyFields(filters, { sort: () => sort }),
      ),
    ChangedGrouping: ({ groupBy }) =>
      navigateIssueFiltersStep(filters =>
        modifyFields(filters, { groupBy: () => groupBy }),
      ),
    RequestedClearFilters: () =>
      navigateIssueFiltersStep(filters =>
        modifyFields(filters, {
          query: () => '',
          maybeStatus: () => Option.none(),
        }),
      ),
    RequestedCreation: () =>
      makeStep(model => {
        return Option.match(AsyncData.getData(model.workspaceAsyncData), {
          onNone: makeNoopStep,
          onSome: workspace => {
            const { route } = model

            const maybeProject = Option.match(maybeProjectId(route), {
              onNone: () => Array.head(workspace.projects),
              onSome: projectId =>
                Array.findFirst(
                  workspace.projects,
                  project => project.id === projectId,
                ),
            })

            return Option.match(maybeProject, {
              onNone: makeNoopStep,
              onSome: project =>
                CreateIssueBinding.requestOpen({ projectId: project.id }),
            })
          },
        })
      }),
  }),
})

const applyOptimisticMoveStep = (
  issue: typeof Issue.Type,
  status: typeof IssueStatus.Type,
  insertionIndex: number,
  previousIndex: number,
) =>
  makeStep(model => ({
    model: modifyFields(model, {
      workspaceAsyncData: AsyncData.map(current =>
        modifyFields(current, {
          issues: issues => moveIssue(issues, issue.id, status, insertionIndex),
        }),
      ),
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId: issue.id,
          previousStatus: issue.status,
          previousIndex,
          expectedVersion: issue.version,
        }),
    }),
    commands: [
      MoveIssue({
        issueId: issue.id,
        status,
        insertionIndex,
        expectedVersion: issue.version,
      }),
    ],
  }))

export const requestMoveIssueStep = (
  issueId: string,
  status: typeof IssueStatus.Type,
  insertionIndex: number,
) =>
  makeStep(model => {
    if (IssueMoveState.guards.MovingIssue(model.issueMoveState)) {
      return { model }
    }

    return Option.match(AsyncData.getData(model.workspaceAsyncData), {
      onNone: () => ({ model }),
      onSome: workspace =>
        Option.match(
          Array.findFirstWithIndex(
            workspace.issues,
            issue => issue.id === issueId,
          ),
          {
            onNone: () => ({ model }),
            onSome: ([issue, previousIndex]) =>
              Update.combineSteps([
                applyOptimisticMoveStep(
                  issue,
                  status,
                  insertionIndex,
                  previousIndex,
                ),
                IssueBoardBinding.informIssueMoved(issue.projectId, {
                  status,
                  insertionIndex,
                }),
              ]),
          },
        ),
    })
  })

export const IssueBoardBinding = makeMapBinding(IssueBoardBlock, {
  field: 'issueBoards',
})

const IssueBoardBindingWithOutMessagePolicy =
  IssueBoardBinding.withOutMessagePolicy({
    fold: (projectId, outMessage) =>
      makeOutMessageFold(IssueBoardBlock, {
        RequestedCreation: ({ status }) =>
          CreateIssueBinding.requestOpen({ projectId, status }),
        RequestedMove: ({ issueId, status, insertionIndex }) =>
          requestMoveIssueStep(issueId, status, insertionIndex),
      })(outMessage),
  })

export const CommandPaletteBinding = makeBinding(CommandPaletteBlock, {
  field: 'commandPalette',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(CommandPaletteBlock, {
    SelectedIssue: ({ issueId }) =>
      makeCommandsStep(model => [
        NavigateInternal({ url: issueHref(model, issueId) }),
      ]),
    SelectedProject: ({ projectId }) =>
      makeCommandsStep(() => [
        NavigateInternal({ url: projectRouter({ projectId }) }),
      ]),
  }),
})

export const MemberDirectoryBinding = makeBinding(MemberDirectoryBlock, {
  field: 'memberDirectory',
})

const IssueDetailBindingWithOutMessagePolicy =
  IssueDetailBinding.withOutMessagePolicy({
    fold: (_issueId, outMessage) => foldIssueDetailOutMessage(outMessage),
  })

export const ProjectSettingsBinding = makeMapBinding(ProjectSettingsBlock, {
  field: 'projectSettings',
}).withOutMessagePolicy({
  fold: (_projectId, outMessage) =>
    makeOutMessageFold(ProjectSettingsBlock, {
      Saved: ({ project }) =>
        makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(workspace =>
            modifyFields(workspace, {
              projects: Array.map(current =>
                current.id === project.id ? project : current,
              ),
            }),
          ),
        })),
    })(outMessage),
})

export const ApplicationComposition = makeComposition({
  bindings: [
    ActiveMemberBinding,
    ProjectSettingsBinding,
    IssueListBinding,
    CreateIssueBinding,
    IssueBoardBindingWithOutMessagePolicy,
    CommandPaletteBinding,
    MemberDirectoryBinding,
    NotificationCenterBinding,
    IssueDetailBindingWithOutMessagePolicy,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
