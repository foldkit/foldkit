import { Schema as S } from 'effect'
import { AsyncData } from 'foldkit'

import { ParsedApiReference } from './domain'

export const ApiData = S.Struct({
  parsedApi: ParsedApiReference,
  highlights: S.Record(S.String, S.String),
})
export type ApiData = typeof ApiData.Type

export const ApiDataAsyncData = AsyncData.Schema(ApiData, S.String)
export type ApiDataAsyncData = typeof ApiDataAsyncData.schema.Type

export const Disclosures = S.Record(S.String, S.Boolean)
export type Disclosures = typeof Disclosures.Type

export const Model = S.Struct({
  apiData: ApiDataAsyncData.schema,
  disclosures: Disclosures,
})
export type Model = typeof Model.Type
