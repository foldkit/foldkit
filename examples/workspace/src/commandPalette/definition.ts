import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { DialogBlock } from '@foldkit/ui'

export const ResultTarget = defineTaggedUnion({
  Issue: { issueId: Schema.String },
  Project: { projectId: Schema.String },
})

export const Model = Schema.Struct({
  query: Schema.String,
  activeResultIndex: Schema.Number,
  dialog: DialogBlock.Model,
})

export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  PressedOpenShortcut: {},
  UpdatedQuery: { value: Schema.String },
  PressedNextResult: { resultCount: Schema.Number },
  PressedPreviousResult: { resultCount: Schema.Number },
  PressedEnter: { maybeTarget: Schema.Option(ResultTarget) },
  ClickedResult: { target: ResultTarget },
  CompletedScrollActiveResult: {},
})

export const OutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
  SelectedProject: { projectId: Schema.String },
})

export const CommandPaletteDefinition = Block.makeDefinition('CommandPalette', {
  Model,
  Message,
  OutMessage,
})
