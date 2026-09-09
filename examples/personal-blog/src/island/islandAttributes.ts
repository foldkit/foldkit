import { Schema } from 'effect'

export const islandAttributes = {
  Counter: Schema.Struct({ label: Schema.optionalKey(Schema.String) }),
  Note: Schema.Struct({}),
}
