import { Schema as S } from 'effect'

// ❌ Bad
let requestCount = 0

// ✅ Good
export const Model = S.Struct({
  requestCount: S.Number,
})

export type Model = typeof Model.Type
