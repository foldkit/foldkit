import { Schema as S } from 'effect'

export const ExampleSourceFile = S.Struct({
  path: S.String,
  highlightedHtml: S.String,
  rawCode: S.String,
})
export type ExampleSourceFile = typeof ExampleSourceFile.Type

export const ExampleSources = S.Struct({
  files: S.Array(ExampleSourceFile),
})
export type ExampleSources = typeof ExampleSources.Type

type SourceLoader = () => Promise<Readonly<{ default: ExampleSources }>>

const loadersBySlug: Readonly<Record<string, SourceLoader | undefined>> = {
  counter: () => import('virtual:example-sources/counter'),
  todo: () => import('virtual:example-sources/todo'),
  stopwatch: () => import('virtual:example-sources/stopwatch'),
  form: () => import('virtual:example-sources/form'),
  kanban: () => import('virtual:example-sources/kanban'),
  weather: () => import('virtual:example-sources/weather'),
  routing: () => import('virtual:example-sources/routing'),
  'query-sync': () => import('virtual:example-sources/query-sync'),
  'shopping-cart': () => import('virtual:example-sources/shopping-cart'),
  auth: () => import('virtual:example-sources/auth'),
  'pixel-art': () => import('virtual:example-sources/pixel-art'),
  snake: () => import('virtual:example-sources/snake'),
  'crash-view': () => import('virtual:example-sources/crash-view'),
  'websocket-chat': () => import('virtual:example-sources/websocket-chat'),
  'ui-showcase': () => import('virtual:example-sources/ui-showcase'),
}

export const loadSourcesForSlug = async (
  slug: string,
): Promise<ExampleSources> => {
  const loader = loadersBySlug[slug]
  if (!loader) {
    throw new Error(`Unknown example: ${slug}`)
  }
  const { default: sources } = await loader()
  return sources
}
