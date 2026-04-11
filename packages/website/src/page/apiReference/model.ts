import { Schema as S } from 'effect'
import { Disclosure } from 'foldkit/ui'

import { makeRemoteData } from '../../makeRemoteData'
import { ParsedApiReference } from './domain'

export const ApiData = S.Struct({
  parsedApi: ParsedApiReference,
  highlights: S.Record({ key: S.String, value: S.String }),
})
export type ApiData = typeof ApiData.Type

export const ApiDataRemoteData = makeRemoteData(S.String, ApiData)

export const Disclosures = S.Record({
  key: S.String,
  value: Disclosure.Model,
})
export type Disclosures = typeof Disclosures.Type

export const Model = S.Struct({
  apiData: ApiDataRemoteData.Union,
  disclosures: Disclosures,
})
export type Model = typeof Model.Type
