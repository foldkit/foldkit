import { Option, Record, Schema } from 'effect'
import { AsyncData } from 'foldkit'

import {
  ParsedApiReference,
  resolveModule,
  scopedIdBelongsToModule,
} from './domain'

export const ApiData = Schema.Struct({
  parsedApi: ParsedApiReference,
  highlights: Schema.Record(Schema.String, Schema.String),
})
export type ApiData = typeof ApiData.Type

/**
 * Narrows a full ApiData to what one module's page renders: that module plus
 * only the highlight entries whose scoped ids belong to it. A prerendered
 * module page embeds this slice in its hydration Flags instead of the full
 * reference; the boot Command then loads the full data after hydration so
 * cross-module navigation keeps working.
 */
export const sliceApiDataToModule = (
  apiData: ApiData,
  moduleSlug: string,
): Option.Option<ApiData> =>
  Option.map(resolveModule(apiData.parsedApi, moduleSlug), module => ({
    parsedApi: { modules: [module] },
    highlights: Record.filter(apiData.highlights, (_, id) =>
      scopedIdBelongsToModule(id, module.name),
    ),
  }))

export const ApiDataAsyncData = AsyncData.Schema(ApiData, Schema.String)
export type ApiDataAsyncData = typeof ApiDataAsyncData.schema.Type

export const Disclosures = Schema.Record(Schema.String, Schema.Boolean)
export type Disclosures = typeof Disclosures.Type

export const Model = Schema.Struct({
  apiData: ApiDataAsyncData.schema,
  disclosures: Disclosures,
})
export type Model = typeof Model.Type
