import { Schema } from 'effect'

export const Model = Schema.Struct({
  isMapMessagesUnderHoodOpen: Schema.Boolean,
})
export type Model = typeof Model.Type
