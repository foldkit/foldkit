import { Option } from 'effect'
import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StringListboxBlock,
} from '../../listbox'
import { decodeAssigneeSelection } from './assigneeSelection'
import {
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
  makeRequiredFieldBinding,
} from './block'
import { CommentComposerBlock } from './blocks'
import { OutMessage } from './outMessage'
import { editDraft } from './steps'

export const CommentComposerBinding = makeRequiredFieldBinding(
  CommentComposerBlock,
  {
    field: 'commentComposer',
    init: {
      contextToArgs: ({ issueId }) => [issueId],
    },
  },
).withOutMessagePolicy({
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

export const StatusListboxBinding = makeRequiredFieldBinding(
  StatusListboxBlock,
  {
    field: 'statusListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-status` }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      editDraft(draft => modifyFields(draft, { status: () => value })),
  }),
})

export const PriorityListboxBinding = makeRequiredFieldBinding(
  PriorityListboxBlock,
  {
    field: 'priorityListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-priority` }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      editDraft(draft => modifyFields(draft, { priority: () => value })),
  }),
})

export const ProjectListboxBinding = makeRequiredFieldBinding(
  StringListboxBlock,
  {
    field: 'projectListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-project` }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(StringListboxBlock, {
    Selected: ({ value }) =>
      editDraft(draft => modifyFields(draft, { projectId: () => value })),
  }),
})

export const AssigneeListboxBinding = makeRequiredFieldBinding(
  StringListboxBlock,
  {
    field: 'assigneeListbox',
    init: {
      contextToArgs: ({ issueId }) => [{ id: `issue-${issueId}-assignee` }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(StringListboxBlock, {
    Selected: ({ value }) =>
      Option.match(decodeAssigneeSelection(value), {
        onNone: makeNoopStep,
        onSome: maybeAssigneeId =>
          editDraft(draft =>
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
