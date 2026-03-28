import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

import { Column } from './domain'

export const SavedBoard = S.Struct({
  columns: S.Array(Column.Column),
})

export type SavedBoard = typeof SavedBoard.Type

export const Model = S.Struct({
  columns: S.Array(Column.Column),
  dragAndDrop: Ui.DragAndDrop.Model,
  maybeNewCardColumnId: S.OptionFromSelf(S.String),
  newCardTitle: S.String,
  nextCardId: S.Number,
  announcement: S.String,
})

export type Model = typeof Model.Type
