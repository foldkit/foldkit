import { Schema } from 'effect'
import type { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui'

import { IssuePriority, IssueStatus } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'
import { CreateIssueDefinition, makeNoopStep } from './definition'
import { editDraftStep } from './draft'

export const DialogBinding = CreateIssueDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'workspace-create-issue-dialog' }],
  },
}).withOutMessagePolicy({
  fold: CreateIssueDefinition.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})

export const ProjectListboxBinding = CreateIssueDefinition.makeBinding(
  WorkspaceListboxBlock,
  {
    field: 'projectListbox',
    init: {
      contextToArgs: () => [{ id: 'create-issue-project' }],
    },
  },
).withOutMessagePolicy({
  fold: CreateIssueDefinition.makeOutMessageFold(WorkspaceListboxBlock, {
    Selected: ({ value }) =>
      editDraftStep(model => modifyFields(model, { projectId: () => value })),
  }),
})

export const StatusListboxBinding = CreateIssueDefinition.makeBinding(
  StatusListboxBlock,
  {
    field: 'statusListbox',
    init: {
      contextToArgs: () => [{ id: 'create-issue-status' }],
    },
  },
).withOutMessagePolicy({
  fold: CreateIssueDefinition.makeOutMessageFold(StatusListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssueStatus)(value)
        ? editDraftStep(model => modifyFields(model, { status: () => value }))
        : makeNoopStep(),
  }),
})

export const PriorityListboxBinding = CreateIssueDefinition.makeBinding(
  PriorityListboxBlock,
  {
    field: 'priorityListbox',
    init: {
      contextToArgs: () => [{ id: 'create-issue-priority' }],
    },
  },
).withOutMessagePolicy({
  fold: CreateIssueDefinition.makeOutMessageFold(PriorityListboxBlock, {
    Selected: ({ value }) =>
      Schema.is(IssuePriority)(value)
        ? editDraftStep(model => modifyFields(model, { priority: () => value }))
        : makeNoopStep(),
  }),
})

export const CreateIssueComposition = CreateIssueDefinition.makeComposition({
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
