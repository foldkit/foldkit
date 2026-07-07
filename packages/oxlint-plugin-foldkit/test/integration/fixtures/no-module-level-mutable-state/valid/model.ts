import { Schema as S } from 'effect'

// MODEL

export const Model = S.Struct({
  requestCount: S.Number,
})

export type Model = typeof Model.Type
