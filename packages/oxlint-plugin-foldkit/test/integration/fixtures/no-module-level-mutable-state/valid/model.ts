import { Schema } from 'effect'

// MODEL

export const Model = Schema.Struct({
  requestCount: Schema.Number,
})

export type Model = typeof Model.Type
