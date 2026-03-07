import { Schema as S } from 'effect'

// Later, when the counter gains auto-counting,
// the model grows to hold new state:

const Model = S.Struct({
  count: S.Number,
  isAutoCounting: S.Boolean,
})
type Model = typeof Model.Type
