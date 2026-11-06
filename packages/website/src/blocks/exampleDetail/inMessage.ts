import { Schema } from 'effect'
import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  InformedOfRouteChange: { slug: Schema.String },
})
export type InMessage = typeof InMessage.Type
