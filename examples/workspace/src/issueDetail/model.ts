import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { CommentComposerBlock } from '../commentComposer'
import { IssueDraft, IssueRevision } from '../domain'
import {
  PriorityListboxBlock,
  StatusListboxBlock,
  WorkspaceListboxBlock,
} from '../listbox'

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: { expectedVersion: Schema.Number },
  Failed: { error: Schema.String },
})
export type SaveState = typeof SaveState.Type

export const Model = Schema.Struct({
  issueId: Schema.String,
  baseline: IssueRevision,
  draft: IssueDraft,
  maybeIncomingRevision: Schema.Option(IssueRevision),
  saveState: SaveState,
  commentComposer: CommentComposerBlock.Model,
  statusListbox: StatusListboxBlock.Model,
  priorityListbox: PriorityListboxBlock.Model,
  projectListbox: WorkspaceListboxBlock.Model,
  assigneeListbox: WorkspaceListboxBlock.Model,
})
export type Model = typeof Model.Type
