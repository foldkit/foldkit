import { Schema } from 'effect'

export const Model = Schema.Struct({
  isMessageRoutingUnderHoodOpen: Schema.Boolean,
})
export type Model = typeof Model.Type
