import { Schema } from 'effect'

// Absence modeled with Schema.Option, the sanctioned form.
export const Model = Schema.Struct({
  currentUser: Schema.Option(Schema.String),
  count: Schema.Number,
})

// Not the Model schema; a wire type may legitimately carry null.
export const ApiUser = Schema.Struct({
  avatar: Schema.NullOr(Schema.String),
})
