import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { DialogBlock } from '@foldkit/ui'

import { IssuePriority, IssueStatus } from '../domain'
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
export type CreateState = typeof CreateState.Type

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
export type Model = typeof Model.Type
