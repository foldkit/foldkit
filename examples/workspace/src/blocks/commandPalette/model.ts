import { Schema } from 'effect'

import { Dialog } from '@foldkit/ui'

export const Model = Schema.Struct({
  query: Schema.String,
  activeResultIndex: Schema.Number,
  dialog: Dialog.DialogBlock.Model,
})
export type Model = typeof Model.Type
