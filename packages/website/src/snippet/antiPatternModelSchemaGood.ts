// ✅ Good: the TypeScript type comes from the Schema.

import { Schema } from 'effect'

const Session = Schema.Struct({
  userId: Schema.String,
  displayName: Schema.String,
})

const Model = Schema.Struct({
  session: Session,
})
type Model = typeof Model.Type
