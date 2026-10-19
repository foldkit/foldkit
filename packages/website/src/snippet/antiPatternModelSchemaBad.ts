// ❌ Bad: TypeScript and the decoder disagree about session.

import { Schema } from 'effect'

type Model = {
  session: {
    userId: string
    displayName: string
  }
}

const ModelSchema = Schema.Struct({
  session: Schema.Unknown,
})
