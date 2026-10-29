import { Schema } from 'effect'

import { DialogBlock } from '@foldkit/ui'

export const Model = Schema.Struct({
  query: Schema.String,
  activeResultIndex: Schema.Number,
  dialog: DialogBlock.Model,
})
export type Model = typeof Model.Type
