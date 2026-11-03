import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const InMessage = defineMessageUnion({
  InformedOfRouteChange: { slug: Schema.String },
})
export type InMessage = typeof InMessage.Type
