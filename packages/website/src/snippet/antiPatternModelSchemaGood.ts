// ✅ Good: the TypeScript type comes from the Schema.

import { Schema } from 'effect'

export const Session = Schema.Struct({
  userId: Schema.String,
  displayName: Schema.String,
})
export type Session = typeof Session.Type

export const Model = Schema.Struct({
  session: Session,
})
export type Model = typeof Model.Type
