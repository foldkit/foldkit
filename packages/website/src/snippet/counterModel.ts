import { Schema } from 'effect'

// MODEL

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type
