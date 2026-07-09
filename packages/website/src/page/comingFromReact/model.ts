import { Schema as S } from 'effect'

export const Model = S.Record(S.String, S.Boolean)
export type Model = typeof Model.Type
