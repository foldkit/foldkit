import { Context, Effect, Layer, Schema as S } from 'effect'
import { HttpClient } from 'effect/unstable/http'

import type { PackageSpec } from './domain'
import { encodePackageName, fetchJson } from './http'

// CONSTANT

const NPM_DOWNLOADS_API = 'https://api.npmjs.org/downloads/range/last-year'
const NPM_REGISTRY_API = 'https://registry.npmjs.org'

// SCHEMA

export const NpmDownloadDay = S.Struct({
  day: S.String,
  downloads: S.Number,
})

export const NpmDownloadsResponse = S.Struct({
  downloads: S.Array(NpmDownloadDay),
})

export const NpmVersionMetadata = S.Struct({
  dependencies: S.OptionFromOptional(S.Record(S.String, S.String)),
  peerDependencies: S.OptionFromOptional(S.Record(S.String, S.String)),
})
export type NpmVersionMetadata = typeof NpmVersionMetadata.Type

export const NpmPackument = S.Struct({
  name: S.String,
  time: S.Record(S.String, S.String),
  versions: S.Record(S.String, NpmVersionMetadata),
  'dist-tags': S.Struct({
    latest: S.String,
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
