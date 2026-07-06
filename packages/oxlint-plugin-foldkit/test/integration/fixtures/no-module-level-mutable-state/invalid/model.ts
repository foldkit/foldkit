import { Schema as S } from 'effect'

// MODEL

let requestCount = 0

export const Model = S.Struct({
  count: S.Number,
})

export type Model = typeof Model.Type
