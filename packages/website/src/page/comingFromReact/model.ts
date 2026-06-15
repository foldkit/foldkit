import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'

export const Model = S.Record(S.String, Disclosure.Model)
export type Model = typeof Model.Type
