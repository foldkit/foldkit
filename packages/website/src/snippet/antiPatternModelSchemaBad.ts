// ❌ Bad: TypeScript and the decoder disagree about session.

import { Schema } from 'effect'

export type Model = {
  session: {
    userId: string
    displayName: string
  }
}

export const ModelSchema = Schema.Struct({
  session: Schema.Unknown,
})
export type ModelSchema = typeof ModelSchema.Type
