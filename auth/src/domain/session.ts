import { Schema as S } from 'effect'

export const Session = S.Struct({
  userId: S.String,
  email: S.String,
  name: S.String,
})

export type Session = typeof Session.Type
