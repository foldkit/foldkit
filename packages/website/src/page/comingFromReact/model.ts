import { Schema as S } from 'effect'
import { Disclosure } from 'foldkit/ui'

export const Model = S.Record(S.String, Disclosure.Model)
export type Model = typeof Model.Type
