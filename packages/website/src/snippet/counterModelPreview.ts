import { Schema as S } from 'effect'

// When the counter gains auto-counting,
// the Model grows to hold new state:

const Model = S.Struct({
  count: S.Number,
  isAutoCounting: S.Boolean,
})
type Model = typeof Model.Type
