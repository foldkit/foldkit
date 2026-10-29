import { Schema } from 'effect'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type
