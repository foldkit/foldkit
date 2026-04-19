import { Schema as S } from 'effect'

export const Card = S.Struct({
  id: S.String,
  title: S.String,
  description: S.String,
  sortKey: S.String,
})

export type Card = typeof Card.Type
