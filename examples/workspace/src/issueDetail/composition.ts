import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CommentComposerBlock } from '../commentComposer'
import { IssueDraft, IssuePriority, IssueStatus } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'
import { IssueDetailDefinition, OutMessage, SaveState } from './definition'
import { maybeRetainedDraft, reconcileIssue } from './draft'
import { decodeAssigneeSelection } from './field'

export const CommentComposerBinding = IssueDetailDefinition.makeBinding(
  CommentComposerBlock,
  {
    field: 'commentComposer',
    init: {
      contextToArgs: ({ issueId, commentBody }) => [issueId, commentBody],
    },
  },
).withOutMessagePolicy({
  fold: IssueDetailDefinition.makeOutMessageFold(CommentComposerBlock, {
    AddedComment: ({ issue }) =>
      IssueDetailDefinition.makeStep(model => {
        const reconciled = reconcileIssue(model, issue)

        return {
          model:
            reconciled === model
              ? model
              : modifyFields(model, {
                  baseline: () => reconciled.baseline,
                  draft: () => reconciled.draft,
                  maybeIncomingRevision: () => reconciled.maybeIncomingRevision,
                  saveState: () => reconciled.saveState,
                }),
          outMessage: OutMessage.ObservedIssue({ issue }),
        }
      }),
    ReportedDraft: ({ body }) =>
      IssueDetailDefinition.makeStep(model => ({
        model,
        outMessage: OutMessage.ChangedDraft({
          issueId: model.issueId,
          maybeDraft: maybeRetainedDraft(model, body),
        }),
      })),
  }),
})

const reportDraft = CommentComposerBinding.requestReportDraft()

const keepModel = IssueDetailDefinition.makeNoopStep()

export const changeDraft =
  (toDraft: (draft: typeof IssueDraft.Type) => typeof IssueDraft.Type) =>
  (model: Parameters<typeof reportDraft>[0]) => {
    if (SaveState.guards.Saving(model.saveState)) {
      return keepModel(model)
    }

    return reportDraft(modifyFields(model, { draft: toDraft }))
  }

export const StatusBinding = IssueDetailDefinition.makeBinding(
  StatusListboxBlock,
  {
    field: 'statusListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-status` }],
    },
  },
).withOutMessagePolicy({
  fold: IssueDetailDefinition.makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssueStatus)(value)
        ? changeDraft(draft => modifyFields(draft, { status: () => value }))
        : IssueDetailDefinition.makeNoopStep(),
  }),
})

export const PriorityBinding = IssueDetailDefinition.makeBinding(
  PriorityListboxBlock,
  {
    field: 'priorityListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-priority` }],
    },
  },
).withOutMessagePolicy({
  fold: IssueDetailDefinition.makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssuePriority)(value)
        ? changeDraft(draft => modifyFields(draft, { priority: () => value }))
        : IssueDetailDefinition.makeNoopStep(),
  }),
})

export const ProjectBinding = IssueDetailDefinition.makeBinding(
  WorkspaceListboxBlock,
  {
    field: 'projectListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-project` }],
    },
  },
).withOutMessagePolicy({
  fold: IssueDetailDefinition.makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      changeDraft(draft => modifyFields(draft, { projectId: () => value })),
  }),
})

export const AssigneeBinding = IssueDetailDefinition.makeBinding(
  WorkspaceListboxBlock,
  {
    field: 'assigneeListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-assignee` }],
    },
  },
).withOutMessagePolicy({
  fold: IssueDetailDefinition.makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      Option.match(decodeAssigneeSelection(value), {
        onNone: IssueDetailDefinition.makeNoopStep,
        onSome: maybeAssigneeId =>
          changeDraft(draft =>
            modifyFields(draft, { maybeAssigneeId: () => maybeAssigneeId }),
          ),
      }),
  }),
})

export const IssueDetailComposition = IssueDetailDefinition.makeComposition({
  bindings: [
    CommentComposerBinding,
    StatusBinding,
    PriorityBinding,
    ProjectBinding,
    AssigneeBinding,
  ],
})
export type IssueDetailViewBuilder = Block.ViewBuilderFor<
  typeof IssueDetailComposition
>
