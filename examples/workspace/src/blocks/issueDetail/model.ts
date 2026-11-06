import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Issue } from '../../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  StringListboxBlock,
} from '../../listbox'
import { CommentComposerBlock } from './blocks'

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: { expectedVersion: Schema.Number },
  Failed: { error: Schema.String },
})
export type SaveState = typeof SaveState.Type

export const Model = Schema.Struct({
  issueId: Schema.String,
  baselineRevision: Issue.Revision,
  draft: Issue.Draft,
  saveState: SaveState,
  commentComposer: CommentComposerBlock.Model,
  statusListbox: StatusListboxBlock.Model,
  priorityListbox: PriorityListboxBlock.Model,
  projectListbox: StringListboxBlock.Model,
  assigneeListbox: StringListboxBlock.Model,
})
export type Model = typeof Model.Type
