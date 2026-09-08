import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient } from 'effect/unstable/http'

import type { PackageSpec } from './domain'
import { encodePackageName, fetchJson } from './http'

// CONSTANT

const NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads/range/last-year'
const NPM_REGISTRY_API = 'https://registry.npmjs.org'

// SCHEMA

export const NpmDownloadDay = Schema.Struct({
  day: Schema.String,
  downloads: Schema.Number,
})

export const NpmDownloadsResponse = Schema.Struct({
  downloads: Schema.Array(NpmDownloadDay),
})

export const NpmVersionMetadata = Schema.Struct({
  dependencies: Schema.OptionFromOptional(
    Schema.Record(Schema.String, Schema.String),
  ),
  peerDependencies: Schema.OptionFromOptional(
    Schema.Record(Schema.String, Schema.String),
  ),
})
export type NpmVersionMetadata = typeof NpmVersionMetadata.Type

export const NpmPackument = Schema.Struct({
  name: Schema.String,
  time: Schema.Record(Schema.String, Schema.String),
  versions: Schema.Record(Schema.String, NpmVersionMetadata),
  'dist-tags': Schema.Struct({
    latest: Schema.String,
  }),
})

// SERVICE

type NpmApiShape = Readonly<{
  fetchPackage: (spec: PackageSpec) => Effect.Effect<
    Readonly<{
      downloads: typeof NpmDownloadsResponse.Type
      packument: typeof NpmPackument.Type
    }>,
    Error
  >
}>

export class NpmApi extends Context.Service<NpmApi, NpmApiShape>()(
  'charting/NpmApi',
) {}

export const NpmApiLive: Layer.Layer<NpmApi, never, HttpClient.HttpClient> =
  Layer.effect(
    NpmApi,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const fetch_ = fetchJson(client)
      return {
        fetchPackage: (spec: PackageSpec) =>
          Effect.all(
            {
              downloads: fetch_(NpmDownloadsResponse)(
                `${NPM_DOWNLOADS_API}/${encodePackageName(spec.npmName)}`,
              ),
              packument: fetch_(NpmPackument)(
                `${NPM_REGISTRY_API}/${encodePackageName(spec.npmName)}`,
              ),
            },
            { concurrency: 'unbounded' },
          ),
      }
    }),
  )
