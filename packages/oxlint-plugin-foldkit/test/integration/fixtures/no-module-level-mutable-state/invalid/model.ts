import { Schema } from 'effect'

// MODEL

let requestCount = 0

export const Model = Schema.Struct({
  count: Schema.Number,
})

export type Model = typeof Model.Type
