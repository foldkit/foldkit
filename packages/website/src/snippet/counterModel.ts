import { Schema as S } from 'effect'

// MODEL

const Model = S.Struct({
  count: S.Number,
})
type Model = typeof Model.Type
