import { Schema } from 'effect'

import { Dialog } from '@foldkit/ui'

import { SearchState } from './domain'

export const Model = Schema.Struct({
  dialog: Dialog.Dialog,
  query: Schema.String,
  searchState: SearchState,
  activeResultIndex: Schema.Number,
})
export type Model = typeof Model.Type
