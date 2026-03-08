import { Array, Option, Record, Schema as S, pipe } from 'effect'

import apiJson from '../../generated/api.json'
import { type ApiModule, moduleNameToSlug, parseTypedocJson } from './domain'
import { TypeDocJson } from './typedoc'

export * from './domain'
export { Model } from './model'
export { Message } from './message'
export { init } from './init'
export { update } from './update'
export { view } from './view'
export type { TypeDocJson } from './typedoc'

export const apiReference = parseTypedocJson(S.decodeUnknownSync(TypeDocJson)(apiJson))

export const modulesBySlug: Record<string, ApiModule> = pipe(
  apiReference.modules,
  Array.map(module => [moduleNameToSlug(module.name), module] as const),
  Record.fromEntries,
)

export const slugToModule = (slug: string): Option.Option<ApiModule> =>
  Record.get(modulesBySlug, slug)

export const moduleSlugs: ReadonlyArray<{
  readonly slug: string
  readonly name: string
}> = Array.map(apiReference.modules, ({ name }) => ({
  slug: moduleNameToSlug(name),
  name,
}))
