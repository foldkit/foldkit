import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { DialogBlock } from '@foldkit/ui'

import { Issue, IssuePriority, IssueStatus } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'

export const CreateState = defineTaggedUnion({
  Idle: {},
  Creating: {},
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  projectId: Schema.String,
  status: IssueStatus,
  priority: IssuePriority,
  createState: CreateState,
  dialog: DialogBlock.Model,
  projectListbox: WorkspaceListboxBlock.Model,
  statusListbox: StatusListboxBlock.Model,
  priorityListbox: PriorityListboxBlock.Model,
})

export const Message = defineMessageUnion({
  RequestedOpen: {
    projectId: Schema.String,
    status: Schema.optionalKey(IssueStatus),
  },
  RequestedClose: {},
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  SucceededCreateIssue: { issue: Issue },
  FailedCreateIssue: { error: Schema.String },
})

export const OutMessage = defineMessageUnion({
  Created: { issue: Issue },
})

export const CreateIssueDefinition = Block.makeDefinition('CreateIssue', {
  Model,
  Message,
  OutMessage,
})

export const { makeStep, makeFieldsStep, makeNoopStep } = CreateIssueDefinition
