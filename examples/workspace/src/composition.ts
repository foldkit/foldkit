import { Array, Number, Option } from 'effect'
import { AsyncData, type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { IssueBoardBlock } from './board'
import { MoveIssue, NavigateInternal, ReplaceInternalUrl } from './command'
import { CommandPaletteBlock } from './commandPalette'
import { CreateIssueBlock } from './createIssue'
import { ApplicationDefinition } from './definition'
import {
  type Issue,
  type IssueFilters,
  type IssueStatus,
  NotificationActivity,
  type RetainedIssueDraft,
  SavedView,
  mergeIssue,
  moveIssue,
} from './domain'
import { IssueDetailBlock } from './issueDetail'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { MemberDirectoryBlock } from './memberDirectory'
import { IssueMoveState, appliedIssueFilters } from './model'
import { issueFiltersHref, issueHref } from './navigation'
import { NotificationCenterBlock } from './notifications'
import { ProjectSettingsBlock } from './projectSettings'
import { maybeProjectId, pageRoute, projectRouter, routeToPath } from './route'

export const ActiveMemberBinding = ApplicationDefinition.makeBinding(
  WorkspaceListboxBlock,
  {
    field: 'activeMemberListbox',
    init: { contextToArgs: () => [{ id: 'workspace-active-member' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      ApplicationDefinition.makeFieldsStep(model => ({
        activeMemberId: current =>
          Option.exists(AsyncData.getData(model.workspaceAsyncData), snapshot =>
            Array.some(snapshot.members, member => member.id === value),
          )
            ? value
            : current,
      })),
  }),
})

export const IssueDetailBinding = ApplicationDefinition.makeBinding(
  IssueDetailBlock,
  {
    field: 'issueDetailInstances',
    key: 'issueId',
    childField: 'model',
    init: {
      instances: () => [],
      toItem: ({ key }, issueDetail) => ({ issueId: key, model: issueDetail }),
    },
  },
)

const openIssue = (issueId: string) =>
  ApplicationDefinition.makeCommandsStep(model => [
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
        ApplicationDefinition.makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(snapshot =>
            modifyFields(snapshot, {
              issues: Array.append(issue),
            }),
          ),
          maybeNotice: () => Option.some(`${issue.identifier} created`),
        })),
        openIssue(issue.id),
      ]),
  }),
})

export const NotificationCenterBinding = ApplicationDefinition.makeBinding(
  NotificationCenterBlock,
  { field: 'notificationCenter' },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(NotificationCenterBlock, {
    SelectedIssue: ({ issueId }) => openIssue(issueId),
  }),
})

const notifyNewComments = (issue: typeof Issue.Type) =>
  ApplicationDefinition.makeStep(model => {
    const maybePreviousIssue = Option.flatMap(
      AsyncData.getData(model.workspaceAsyncData),
      snapshot =>
        Array.findFirst(snapshot.issues, previous => previous.id === issue.id),
    )

    if (Option.isNone(maybePreviousIssue)) {
      return ApplicationDefinition.makeNoopStep()
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

export const applyIssueRevision = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    notifyNewComments(issue),
    ApplicationDefinition.makeFieldsStep(() => ({
      workspaceAsyncData: AsyncData.map(snapshot =>
        modifyFields(snapshot, {
          issues: Array.map(current =>
            current.id === issue.id ? mergeIssue(current, issue) : current,
          ),
        }),
      ),
    })),
  ])

const retainIssueDraft = (
  issueId: string,
  maybeDraft: Option.Option<typeof RetainedIssueDraft.Type>,
) =>
  ApplicationDefinition.makeFieldsStep(() => ({
    issueDrafts: drafts => {
      const remaining = Array.filter(drafts, draft => draft.issueId !== issueId)

      return Option.match(maybeDraft, {
        onNone: () => remaining,
        onSome: draft => Array.append(remaining, draft),
      })
    },
  }))

const foldIssueDetailOutMessage = ApplicationDefinition.makeOutMessageFold(
  IssueDetailBlock,
  {
    Saved: ({ issue }) =>
      Update.combineSteps([
        applyIssueRevision(issue),
        ApplicationDefinition.makeFieldsStep(() => ({
          maybeNotice: () => Option.some(`${issue.identifier} saved`),
        })),
        IssueDetailBinding.requestReportDraft(issue.id),
      ]),
    ObservedIssue: ({ issue }) =>
      Update.combineSteps([
        applyIssueRevision(issue),
        IssueDetailBinding.requestReportDraft(issue.id),
      ]),
    ChangedDraft: ({ issueId, maybeDraft }) =>
      retainIssueDraft(issueId, maybeDraft),
    Closed: () =>
      ApplicationDefinition.makeCommandsStep(model => [
        NavigateInternal({ url: routeToPath(pageRoute(model.route)) }),
      ]),
  },
)

const navigateIssueFilters = (
  change: (filters: typeof IssueFilters.Type) => typeof IssueFilters.Type,
) =>
  ApplicationDefinition.makeCommandsStep(model => [
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
      ApplicationDefinition.makeFieldsStep(model => ({
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
      ApplicationDefinition.makeCommandsStep(model => [
        ReplaceInternalUrl({
          url: issueFiltersHref(
            model,
            modifyFields(appliedIssueFilters(model), { query: () => query }),
          ),
        }),
      ]),
    ChangedStatusFilter: ({ maybeStatus }) =>
      navigateIssueFilters(filters =>
        modifyFields(filters, { maybeStatus: () => maybeStatus }),
      ),
    ChangedSort: ({ sort }) =>
      navigateIssueFilters(filters =>
        modifyFields(filters, { sort: () => sort }),
      ),
    ChangedGrouping: ({ groupBy }) =>
      navigateIssueFilters(filters =>
        modifyFields(filters, { groupBy: () => groupBy }),
      ),
    RequestedClearFilters: () =>
      navigateIssueFilters(filters =>
        modifyFields(filters, {
          query: () => '',
          maybeStatus: () => Option.none(),
        }),
      ),
    RequestedCreation: () =>
      ApplicationDefinition.makeStep(model => {
        return Option.match(AsyncData.getData(model.workspaceAsyncData), {
          onNone: ApplicationDefinition.makeNoopStep,
          onSome: snapshot => {
            const route = pageRoute(model.route)

            const maybeProject = Option.match(maybeProjectId(route), {
              onNone: () => Array.head(snapshot.projects),
              onSome: projectId =>
                Array.findFirst(
                  snapshot.projects,
                  project => project.id === projectId,
                ),
            })

            return Option.match(maybeProject, {
              onNone: ApplicationDefinition.makeNoopStep,
              onSome: project =>
                CreateIssueBinding.requestOpen({ projectId: project.id }),
            })
          },
        })
      }),
  }),
})

const applyOptimisticMove = (
  issue: typeof Issue.Type,
  status: typeof IssueStatus.Type,
  insertionIndex: number,
  previousIndex: number,
) =>
  ApplicationDefinition.makeStep(model => ({
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

export const requestMoveIssue = (
  issueId: string,
  status: typeof IssueStatus.Type,
  insertionIndex: number,
) =>
  ApplicationDefinition.makeStep(model => {
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
                applyOptimisticMove(
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

export const IssueBoardBinding = ApplicationDefinition.makeBinding(
  IssueBoardBlock,
  {
    field: 'boardInstances',
    key: 'projectId',
    childField: 'model',
    init: {
      instances: () => [],
      toItem: ({ key }, board) => ({ projectId: key, model: board }),
    },
  },
)

const IssueBoardBindingWithOutMessagePolicy =
  IssueBoardBinding.withOutMessagePolicy({
    fold: (projectId, outMessage) =>
      ApplicationDefinition.makeOutMessageFold(IssueBoardBlock, {
        RequestedCreation: ({ status }) =>
          CreateIssueBinding.requestOpen({ projectId, status }),
        RequestedMove: ({ issueId, status, insertionIndex }) =>
          requestMoveIssue(issueId, status, insertionIndex),
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
      ApplicationDefinition.makeCommandsStep(model => [
        NavigateInternal({ url: issueHref(model, issueId) }),
      ]),
    SelectedProject: ({ projectId }) =>
      ApplicationDefinition.makeCommandsStep(() => [
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

export const ProjectSettingsBinding = ApplicationDefinition.makeBinding(
  ProjectSettingsBlock,
  {
    field: 'projectSettingsInstances',
    key: 'projectId',
    childField: 'model',
    init: {
      instances: () => [],
      toItem: ({ key }, settings) => ({ projectId: key, model: settings }),
    },
  },
).withOutMessagePolicy({
  fold: (_projectId, outMessage) =>
    ApplicationDefinition.makeOutMessageFold(ProjectSettingsBlock, {
      Saved: ({ project }) =>
        ApplicationDefinition.makeFieldsStep(() => ({
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
