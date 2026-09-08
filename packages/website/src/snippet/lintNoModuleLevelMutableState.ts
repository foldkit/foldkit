import { Schema } from 'effect'

// ❌ Bad
let requestCount = 0

// ✅ Good
export const Model = Schema.Struct({
  requestCount: Schema.Number,
})
export type Model = typeof Model.Type
