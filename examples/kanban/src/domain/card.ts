import { Schema } from 'effect'

export const Card = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  sortKey: Schema.String,
})

export type Card = typeof Card.Type
