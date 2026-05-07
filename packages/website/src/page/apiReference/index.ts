import { Array, Option, Record, pipe } from 'effect'

import {
  type ApiModule,
  type ParsedApiReference,
  moduleNameToSlug,
} from './domain'

export * from './domain'
export { ApiData, ApiDataRemoteData, Model } from './model'
export type { Disclosures } from './model'
export {
  FailedLoadApiData,
  GotDisclosureMessage,
  Message,
  StartedLoadApiData,
  SucceededLoadApiData,
} from './message'
export { LoadApiData } from './command'
export { init } from './init'
export { update } from './update'
export { failureView, skeletonView, view } from './view'
export type { TypeDocJson } from './typedoc'

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
