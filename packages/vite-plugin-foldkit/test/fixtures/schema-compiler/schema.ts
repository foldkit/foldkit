import { Schema } from 'effect'

export const User = Schema.Struct({
  name: Schema.String,
  age: Schema.Int,
})
