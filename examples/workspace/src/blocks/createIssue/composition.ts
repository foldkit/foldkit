import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StringListboxBlock,
} from '../../listbox'
import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
} from './block'
import { editIssueForm } from './draft'

export const DialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'workspace-create-issue-dialog' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})

export const ProjectListboxBinding = makeBinding(StringListboxBlock, {
  field: 'projectListbox',
  init: {
    contextToArgs: () => [{ id: 'create-issue-project' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StringListboxBlock, {
    Selected: ({ value }) =>
      editIssueForm(model => modifyFields(model, { projectId: () => value })),
  }),
})

export const StatusListboxBinding = makeBinding(StatusListboxBlock, {
  field: 'statusListbox',
  init: {
    contextToArgs: () => [{ id: 'create-issue-status' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      editIssueForm(model => modifyFields(model, { status: () => value })),
  }),
})

export const PriorityListboxBinding = makeBinding(PriorityListboxBlock, {
  field: 'priorityListbox',
  init: {
    contextToArgs: () => [{ id: 'create-issue-priority' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      editIssueForm(model => modifyFields(model, { priority: () => value })),
  }),
})

export const CreateIssueComposition = makeComposition({
  bindings: [
    DialogBinding,
    ProjectListboxBinding,
    StatusListboxBinding,
    PriorityListboxBinding,
  ],
})
export type CreateIssueViewBuilder = Block.ViewBuilderFor<
  typeof CreateIssueComposition
>
