import { Schema } from 'effect'

export const Model = Schema.Struct({
  query: Schema.String,
  maybeSelectedMemberId: Schema.Option(Schema.String),
})
