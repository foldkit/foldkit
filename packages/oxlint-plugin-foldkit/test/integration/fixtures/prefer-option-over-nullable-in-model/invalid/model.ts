import { Schema } from 'effect'

// Model absence must use Schema.Option, not these nullable or optional members.
export const Model = Schema.Struct({
  currentUser: Schema.NullOr(Schema.String),
  nickname: Schema.optional(Schema.String),
  bio: Schema.optionalKey(Schema.String),
  avatar: Schema.NullishOr(Schema.String),
  displayName: Schema.UndefinedOr(Schema.String),
  token: Schema.Null,
  sentinel: Schema.Undefined,
})
