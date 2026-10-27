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
import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} from './definition'
import { reconcileIssue } from './draft'
import { decodeAssigneeSelection } from './field'
import { SaveState } from './model'
import { OutMessage } from './outMessage'

export const CommentComposerBinding = makeBinding(CommentComposerBlock, {
  field: 'commentComposer',
  init: {
    contextToArgs: ({ issueId }) => [issueId],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(CommentComposerBlock, {
    AddedComment: ({ issue }) =>
      makeStep(model => ({
        model: reconcileIssue(model, issue),
        outMessage: OutMessage.ReceivedIssue({ issue }),
      })),
  }),
})

export const changeDraftStep = (
  transformDraft: (draft: typeof IssueDraft.Type) => typeof IssueDraft.Type,
) =>
  makeStep(model => ({
    model: SaveState.guards.Saving(model.saveState)
      ? model
      : modifyFields(model, { draft: transformDraft }),
  }))

export const StatusBinding = makeBinding(StatusListboxBlock, {
  field: 'statusListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-status` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssueStatus)(value)
        ? changeDraftStep(draft => modifyFields(draft, { status: () => value }))
        : makeNoopStep(),
  }),
})

export const PriorityBinding = makeBinding(PriorityListboxBlock, {
  field: 'priorityListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-priority` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssuePriority)(value)
        ? changeDraftStep(draft =>
            modifyFields(draft, { priority: () => value }),
          )
        : makeNoopStep(),
  }),
})

export const ProjectBinding = makeBinding(WorkspaceListboxBlock, {
  field: 'projectListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-project` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      changeDraftStep(draft => modifyFields(draft, { projectId: () => value })),
  }),
})

export const AssigneeBinding = makeBinding(WorkspaceListboxBlock, {
  field: 'assigneeListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-assignee` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      Option.match(decodeAssigneeSelection(value), {
        onNone: makeNoopStep,
        onSome: maybeAssigneeId =>
          changeDraftStep(draft =>
            modifyFields(draft, { maybeAssigneeId: () => maybeAssigneeId }),
          ),
      }),
  }),
})

export const IssueDetailComposition = makeComposition({
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
