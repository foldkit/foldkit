import { Array, Number, Option } from 'effect'
import { AsyncData, type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  makeBinding,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeMapBinding,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} from './block'
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
import { NavigateInternal, ReplaceInternalUrl } from './command'
import { type IssueFilters, SavedView } from './domain'
import { issueFiltersHref, issueHref } from './issueLinks'
import { WorkspaceListboxBlock } from './listbox'
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
import {
  applyIssueComment,
  applyIssueSnapshot,
  applySavedIssue,
  requestIssueMove,
} from './steps'

export const ActiveMemberListboxBinding = makeBinding(WorkspaceListboxBlock, {
  field: 'activeMemberListbox',
  init: { contextToArgs: () => [{ id: 'workspace-active-member' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeMemberId: () => value })),
  }),
})

const foldIssueDetailOutMessage = makeOutMessageFold(IssueDetailBlock, {
  Saved: ({ savedIssue }) =>
    Update.combineSteps([
      applySavedIssue(savedIssue),
      makeFieldsStep(() => ({
        maybeNotice: () => Option.some(`${savedIssue.identifier} saved`),
      })),
    ]),
  AddedComment: ({ issueId, comment }) => applyIssueComment(issueId, comment),
  ReceivedIssue: ({ issue }) => applyIssueSnapshot(issue),
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

export const IssueDetailsBinding = makeMapBinding(IssueDetailBlock, {
  field: 'issueDetails',
}).withOutMessagePolicy({
  fold: (_issueId, outMessage) => foldIssueDetailOutMessage(outMessage),
})

const openIssue = (issueId: string) =>
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
        openIssue(issue.id),
      ]),
  }),
})

export const NotificationCenterBinding = makeBinding(NotificationCenterBlock, {
  field: 'notificationCenter',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(NotificationCenterBlock, {
    SelectedIssue: ({ issueId }) => openIssue(issueId),
  }),
})

const navigateIssueFilters = (
  change: (filters: IssueFilters) => IssueFilters,
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

export const IssueBoardsBinding = makeMapBinding(IssueBoardBlock, {
  field: 'issueBoards',
}).withOutMessagePolicy({
  fold: (projectId, outMessage) =>
    makeOutMessageFold(IssueBoardBlock, {
      RequestedCreation: ({ status }) =>
        CreateIssueBinding.requestOpen({ projectId, status }),
      RequestedMove: ({ issueId, status, insertionIndex }) =>
        requestIssueMove(issueId, status, insertionIndex),
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

export const ProjectSettingsBinding = makeMapBinding(ProjectSettingsBlock, {
  field: 'projectSettings',
}).withOutMessagePolicy({
  fold: (_projectId, outMessage) =>
    makeOutMessageFold(ProjectSettingsBlock, {
      Saved: ({ project }) =>
        makeFieldsStep(() => ({
          workspaceAsyncData: AsyncData.map(workspace =>
            modifyFields(workspace, {
              projects: Array.map(currentProject =>
                currentProject.id === project.id ? project : currentProject,
              ),
            }),
          ),
        })),
    })(outMessage),
})

export const ApplicationComposition = makeComposition({
  bindings: [
    ActiveMemberListboxBinding,
    ProjectSettingsBinding,
    IssueListBinding,
    CreateIssueBinding,
    IssueBoardsBinding,
    CommandPaletteBinding,
    MemberDirectoryBinding,
    NotificationCenterBinding,
    IssueDetailsBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
