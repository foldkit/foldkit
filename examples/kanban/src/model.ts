import { Schema } from 'effect'

import { DragAndDropBlock } from '@foldkit/ui'

import { Column } from './domain'

export const SavedBoard = Schema.Struct({
  columns: Schema.Array(Column.Column),
})
export type SavedBoard = typeof SavedBoard.Type

export const SavedBoardJsonString = Schema.fromJsonString(
  Schema.toCodecJson(SavedBoard),
)
export type SavedBoardJsonString = typeof SavedBoardJsonString.Type

export const Model = Schema.Struct({
  columns: Schema.Array(Column.Column),
  dragAndDrop: DragAndDropBlock.Model,
  maybeNewCardColumnId: Schema.Option(Schema.String),
  newCardTitle: Schema.String,
  announcement: Schema.String,
})
export type Model = typeof Model.Type
