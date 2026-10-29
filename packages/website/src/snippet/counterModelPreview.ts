import { Schema } from 'effect'

// When the counter gains auto-counting,
// the Model grows to hold new state:

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})
type Model = typeof Model.Type
