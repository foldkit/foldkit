import { Array, Number, Option } from 'effect'
import { AsyncData, type Block, Update } from 'foldkit'
import { makeMapBinding } from 'foldkit/mapBinding'
import { modifyFields } from 'foldkit/struct'

import { IssueBoardBlock } from './board'
import { MoveIssue, NavigateInternal, ReplaceInternalUrl } from './command'
import { CommandPaletteBlock } from './commandPalette'
import { CreateIssueBlock } from './createIssue'
import {
  ApplicationDefinition,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
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
import { IssueDetailBlock } from './issueDetail'
import { issueFiltersHref, issueHref } from './issueLinks'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { MemberDirectoryBlock } from './memberDirectory'
import { IssueMoveState } from './model'
import { NotificationCenterBlock } from './notifications'
import { ProjectSettingsBlock } from './projectSettings'
import {
  maybeProjectId,
  projectRouter,
  routeToPath,
  withoutIssue,
} from './route'
import { appliedIssueFilters } from './selection'

export const ActiveMemberBinding = ApplicationDefinition.makeBinding(
  WorkspaceListboxBlock,
  {
    field: 'activeMemberListbox',
    init: { contextToArgs: () => [{ id: 'workspace-active-member' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(model => ({
        activeMemberId: current =>
          Option.exists(AsyncData.getData(model.workspaceAsyncData), snapshot =>
            Array.some(snapshot.members, member => member.id === value),
          )
            ? value
            : current,
      })),
  }),
})

export const IssueDetailBinding = makeMapBinding(
  ApplicationDefinition,
  IssueDetailBlock,
  {
    field: 'issueDetails',
  },
)

const openIssueStep = (issueId: string) =>
  makeCommandsStep(model => [
    NavigateInternal({ url: issueHref(model, issueId) }),
  ])

export const CreateIssueBinding = ApplicationDefinition.makeBinding(
  CreateIssueBlock,
  {
    field: 'createIssue',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(CreateIssueBlock, {
    Created: ({ issue }) =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(snapshot =>
            modifyFields(snapshot, {
              issues: Array.append(issue),
            }),
          ),
          maybeNotice: () => Option.some(`${issue.identifier} created`),
        })),
        openIssueStep(issue.id),
      ]),
  }),
})

export const NotificationCenterBinding = ApplicationDefinition.makeBinding(
  NotificationCenterBlock,
  { field: 'notificationCenter' },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(NotificationCenterBlock, {
    SelectedIssue: ({ issueId }) => openIssueStep(issueId),
  }),
})

const notifyNewCommentsStep = (issue: typeof Issue.Type) =>
  makeStep(model => {
    const maybePreviousIssue = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      snapshot =>
        Array.findFirst(snapshot.issues, previous => previous.id === issue.id),
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

export const applyIssueRevisionStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    notifyNewCommentsStep(issue),
    makeFieldsStep(() => ({
      workspaceAsyncData: AsyncData.map(snapshot =>
        modifyFields(snapshot, {
          issues: Array.map(current =>
            current.id === issue.id ? mergeIssue(current, issue) : current,
          ),
        }),
      ),
    })),
  ])

const foldIssueDetailOutMessage = ApplicationDefinition.makeOutMessageFold(
  IssueDetailBlock,
  {
    Saved: ({ issue }) =>
      Update.combineSteps([
        applyIssueRevisionStep(issue),
        makeFieldsStep(() => ({
          maybeNotice: () => Option.some(`${issue.identifier} saved`),
        })),
      ]),
    ObservedIssue: ({ issue }) => applyIssueRevisionStep(issue),
    Closed: () =>
      makeCommandsStep(model => [
        NavigateInternal({
          url: routeToPath(withoutIssue(model.route)),
        }),
      ]),
  },
)

const navigateIssueFiltersStep = (
  change: (filters: typeof IssueFilters.Type) => typeof IssueFilters.Type,
) =>
  makeCommandsStep(model => [
    NavigateInternal({
      url: issueFiltersHref(model, change(appliedIssueFilters(model))),
    }),
  ])

export const IssueListBinding = ApplicationDefinition.makeBinding(
  IssueListBlock,
  {
    field: 'issueList',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(IssueListBlock, {
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
          onSome: snapshot => {
            const route = model.route

            const maybeProject = Option.match(maybeProjectId(route), {
              onNone: () => Array.head(snapshot.projects),
              onSome: projectId =>
                Array.findFirst(
                  snapshot.projects,
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
      onSome: snapshot =>
        Option.match(
          Array.findFirst(snapshot.issues, issue => issue.id === issueId),
          {
            onNone: () => ({ model }),
            onSome: issue =>
              Update.combineSteps([
                applyOptimisticMoveStep(
                  issue,
                  status,
                  insertionIndex,
                  Option.getOrElse(
                    Array.findFirstIndex(
                      snapshot.issues,
                      current => current.id === issueId,
                    ),
                    () => 0,
                  ),
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

export const IssueBoardBinding = makeMapBinding(
  ApplicationDefinition,
  IssueBoardBlock,
  {
    field: 'boards',
  },
)

const IssueBoardBindingWithOutMessagePolicy =
  IssueBoardBinding.withOutMessagePolicy({
    fold: (projectId, outMessage) =>
      ApplicationDefinition.makeOutMessageFold(IssueBoardBlock, {
        RequestedCreation: ({ status }) =>
          CreateIssueBinding.requestOpen({ projectId, status }),
        RequestedMove: ({ issueId, status, insertionIndex }) =>
          requestMoveIssueStep(issueId, status, insertionIndex),
      })(outMessage),
  })

export const CommandPaletteBinding = ApplicationDefinition.makeBinding(
  CommandPaletteBlock,
  {
    field: 'commandPalette',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(CommandPaletteBlock, {
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

export const MemberDirectoryBinding = ApplicationDefinition.makeBinding(
  MemberDirectoryBlock,
  { field: 'memberDirectory' },
)

const IssueDetailBindingWithOutMessagePolicy =
  IssueDetailBinding.withOutMessagePolicy({
    fold: (_issueId, outMessage) => foldIssueDetailOutMessage(outMessage),
  })

export const ProjectSettingsBinding = makeMapBinding(
  ApplicationDefinition,
  ProjectSettingsBlock,
  {
    field: 'projectSettings',
  },
).withOutMessagePolicy({
  fold: (_projectId, outMessage) =>
    ApplicationDefinition.makeOutMessageFold(ProjectSettingsBlock, {
      Saved: ({ project }) =>
        makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(snapshot =>
            modifyFields(snapshot, {
              projects: Array.map(current =>
                current.id === project.id ? project : current,
              ),
            }),
          ),
        })),
    })(outMessage),
})

export type ApplicationBindings = readonly [
  typeof ActiveMemberBinding,
  typeof ProjectSettingsBinding,
  typeof IssueListBinding,
  typeof CreateIssueBinding,
  typeof IssueBoardBindingWithOutMessagePolicy,
  typeof CommandPaletteBinding,
  typeof MemberDirectoryBinding,
  typeof NotificationCenterBinding,
  typeof IssueDetailBindingWithOutMessagePolicy,
]

const bindings: ApplicationBindings = [
  ActiveMemberBinding,
  ProjectSettingsBinding,
  IssueListBinding,
  CreateIssueBinding,
  IssueBoardBindingWithOutMessagePolicy,
  CommandPaletteBinding,
  MemberDirectoryBinding,
  NotificationCenterBinding,
  IssueDetailBindingWithOutMessagePolicy,
]

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings,
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
