import { Array, Option, Record, pipe } from 'effect'

import {
  type ApiModule,
  type ParsedApiReference,
  moduleNameToSlug,
} from './domain'

export * from './domain'
export { ApiData, ApiDataRemoteData, Model } from './model'
export type { Disclosures } from './model'
export { Message } from './message'
export { boot, init } from './init'
export { informRouteChanged, update } from './update'
export { failureView, skeletonView, view } from './view'

const modulesBySlug = (
  modules: ReadonlyArray<ApiModule>,
): Record<string, ApiModule> =>
  pipe(
    modules,
    Array.map(module => [moduleNameToSlug(module.name), module] as const),
    Record.fromEntries,
  )

export const resolveModule = (
  parsedApi: ParsedApiReference,
  slug: string,
): Option.Option<ApiModule> =>
  Record.get(modulesBySlug(parsedApi.modules), slug)
