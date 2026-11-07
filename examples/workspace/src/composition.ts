import { Array, Number, Option } from 'effect'
import { AsyncData, type Block, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRecordBinding,
  makeRequiredFieldBinding,
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
import { SavedView, Workspace } from './domain'
import { StringListboxBlock } from './listbox'
import {
  maybeProjectId,
  projectRouter,
  routeHrefWithIssueFilters,
} from './route'
import { effectiveIssueFilters, maybeConfirmedIssue } from './selectors'
import { moveIssue } from './steps/issueMove'
import {
  mergeIssue,
  mergeIssueRevision,
  recordIssueComment,
} from './steps/issues'
import { changeIssueFilters, closeIssue, openIssue } from './steps/navigation'

export const ActiveMemberListboxBinding = makeRequiredFieldBinding(
  StringListboxBlock,
  {
    field: 'activeMemberListbox',
    init: { contextToArgs: () => [{ id: 'workspace-active-member' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(StringListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeMemberId: () => value })),
  }),
})

export const IssueDetailsBinding = makeRecordBinding(IssueDetailBlock, {
  field: 'issueDetails',
  delivery: {
    toUpdateContext: (model, issueId) => [maybeConfirmedIssue(model, issueId)],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(IssueDetailBlock, {
    Saved: ({ saveResult }) =>
      Update.combineSteps([
        mergeIssueRevision(saveResult),
        makeFieldsStep(() => ({
          maybeNotice: () => Option.some(`${saveResult.identifier} saved`),
        })),
      ]),
    AddedComment: ({ issueId, comment }) =>
      recordIssueComment(issueId, comment),
    DetectedSaveConflict: ({ latestIssue }) => mergeIssue(latestIssue),
    RequestedClose: () => closeIssue,
  }),
})

export const CreateIssueBinding = makeRequiredFieldBinding(CreateIssueBlock, {
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

export const NotificationCenterBinding = makeRequiredFieldBinding(
  NotificationCenterBlock,
  {
    field: 'notificationCenter',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(NotificationCenterBlock, {
    SelectedIssue: ({ issueId }) => openIssue(issueId),
  }),
})

export const IssueListBinding = makeRequiredFieldBinding(IssueListBlock, {
  field: 'issueList',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(IssueListBlock, {
    SubmittedSavedView: ({ name, filters }) =>
      makeFieldsStep(model => ({
        savedViews: Array.append(
          SavedView.SavedView.make({
            id: `view-${model.nextSavedViewNumber}`,
            name,
            filters,
          }),
        ),
        nextSavedViewNumber: Number.increment,
        maybeNotice: () => Option.some(`Saved view “${name}”`),
      })),
    ChangedQuery: ({ query }) =>
      makeCommandsStep(model => [
        ReplaceInternalUrl({
          url: routeHrefWithIssueFilters(
            model.route,
            modifyFields(effectiveIssueFilters(model), { query: () => query }),
          ),
        }),
      ]),
    ChangedStatusFilter: ({ maybeStatus }) =>
      changeIssueFilters(filters =>
        modifyFields(filters, { maybeStatus: () => maybeStatus }),
      ),
    ChangedSort: ({ sort }) =>
      changeIssueFilters(filters =>
        modifyFields(filters, { sort: () => sort }),
      ),
    ChangedGrouping: ({ groupBy }) =>
      changeIssueFilters(filters =>
        modifyFields(filters, { groupBy: () => groupBy }),
      ),
    RequestedClearFilters: () =>
      changeIssueFilters(filters =>
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
              onSome: projectId => Workspace.findProject(workspace, projectId),
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

export const IssueBoardsBinding = makeRecordBinding(IssueBoardBlock, {
  field: 'issueBoards',
}).withOutMessagePolicy({
  fold: projectId =>
    makeOutMessageFold(IssueBoardBlock, {
      RequestedCreation: ({ status }) =>
        CreateIssueBinding.requestOpen({ projectId, status }),
      RequestedMove: ({ issueId, status, insertionIndex }) =>
        moveIssue(issueId, status, insertionIndex),
    }),
})

export const CommandPaletteBinding = makeRequiredFieldBinding(
  CommandPaletteBlock,
  {
    field: 'commandPalette',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(CommandPaletteBlock, {
    SelectedIssue: ({ issueId }) => openIssue(issueId),
    SelectedProject: ({ projectId }) =>
      makeCommandsStep(() => [
        NavigateInternal({ url: projectRouter({ projectId }) }),
      ]),
  }),
})

export const MemberDirectoryBinding = makeRequiredFieldBinding(
  MemberDirectoryBlock,
  {
    field: 'memberDirectory',
  },
)

export const ProjectSettingsBinding = makeRecordBinding(ProjectSettingsBlock, {
  field: 'projectSettings',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ProjectSettingsBlock, {
    Saved: ({ project }) =>
      makeFieldsStep(() => ({
        workspaceAsyncData: AsyncData.map(workspace =>
          Workspace.replaceProject(workspace, project),
        ),
      })),
  }),
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
