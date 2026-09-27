import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Items } from './items.ts'

export const ItemsMutation = defineTaggedUnion({
  AddItems: { items: Items },
  ToggleItems: { ids: Schema.Array(Schema.String) },
  DeleteItems: { ids: Schema.Array(Schema.String) },
  ClearCompletedItems: {},
})
export type ItemsMutation = typeof ItemsMutation.Type

export const ItemsMutationResult = defineTaggedUnion({
  Committed: { transactionId: Schema.Number },
  Unchanged: {},
})
export type ItemsMutationResult = typeof ItemsMutationResult.Type
