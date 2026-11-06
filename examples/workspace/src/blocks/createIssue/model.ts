import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Dialog } from '@foldkit/ui'

import { Issue } from '../../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StringListboxBlock,
} from '../../listbox'

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
  status: Issue.Status,
  priority: Issue.Priority,
  createState: CreateState,
  dialog: Dialog.DialogBlock.Model,
  projectListbox: StringListboxBlock.Model,
  statusListbox: StatusListboxBlock.Model,
  priorityListbox: PriorityListboxBlock.Model,
})
export type Model = typeof Model.Type
