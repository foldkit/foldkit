import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CommentComposerBlock } from '../commentComposer'
import { IssuePriority, IssueStatus } from '../domain'
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
  makeOutMessageStep,
} from './definition'
import { decodeAssigneeSelection } from './field'
import { OutMessage } from './outMessage'
import { editDraftStep } from './steps'

export const CommentComposerBinding = makeBinding(CommentComposerBlock, {
  field: 'commentComposer',
  init: {
    contextToArgs: ({ issueId }) => [issueId],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(CommentComposerBlock, {
    AddedComment: ({ comment }) =>
      makeOutMessageStep(model =>
        OutMessage.AddedComment({
          issueId: model.issueId,
          comment,
        }),
      ),
  }),
})

export const StatusListboxBinding = makeBinding(StatusListboxBlock, {
  field: 'statusListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-status` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssueStatus)(value)
        ? editDraftStep(draft => modifyFields(draft, { status: () => value }))
        : makeNoopStep(),
  }),
})

export const PriorityListboxBinding = makeBinding(PriorityListboxBlock, {
  field: 'priorityListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-priority` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssuePriority)(value)
        ? editDraftStep(draft => modifyFields(draft, { priority: () => value }))
        : makeNoopStep(),
  }),
})

export const ProjectListboxBinding = makeBinding(WorkspaceListboxBlock, {
  field: 'projectListbox',
  init: {
    contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-project` }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      editDraftStep(draft => modifyFields(draft, { projectId: () => value })),
  }),
})

export const AssigneeListboxBinding = makeBinding(WorkspaceListboxBlock, {
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
          editDraftStep(draft =>
            modifyFields(draft, { maybeAssigneeId: () => maybeAssigneeId }),
          ),
      }),
  }),
})

export const IssueDetailComposition = makeComposition({
  bindings: [
    CommentComposerBinding,
    StatusListboxBinding,
    PriorityListboxBinding,
    ProjectListboxBinding,
    AssigneeListboxBinding,
  ],
})
export type IssueDetailViewBuilder = Block.ViewBuilderFor<
  typeof IssueDetailComposition
>
