import { Array, Schema } from 'effect'

import * as Issue from './issue'

export const SavedView = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  filters: Issue.Filters,
})
export type SavedView = typeof SavedView.Type

export const findById = (views: ReadonlyArray<SavedView>, viewId: string) =>
  Array.findFirst(views, view => view.id === viewId)
