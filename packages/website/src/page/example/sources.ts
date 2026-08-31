import { Schema } from 'effect'

export const ExampleSourceFile = Schema.Struct({
  path: Schema.String,
  highlightedHtml: Schema.String,
  rawCode: Schema.String,
})
export type ExampleSourceFile = typeof ExampleSourceFile.Type

export const ExampleSources = Schema.Struct({
  files: Schema.Array(ExampleSourceFile),
})
export type ExampleSources = typeof ExampleSources.Type

type SourceLoader = () => Promise<Readonly<{ default: ExampleSources }>>

const loadersBySlug: Readonly<Record<string, SourceLoader | undefined>> = {
  counter: () => import('virtual:example-sources/counter'),
  counters: () => import('virtual:example-sources/counters'),
  todo: () => import('virtual:example-sources/todo'),
  stopwatch: () => import('virtual:example-sources/stopwatch'),
  form: () => import('virtual:example-sources/form'),
  'job-application': () => import('virtual:example-sources/job-application'),
  kanban: () => import('virtual:example-sources/kanban'),
  weather: () => import('virtual:example-sources/weather'),
  'api-cache': () => import('virtual:example-sources/api-cache'),
  charting: () => import('virtual:example-sources/charting'),
  routing: () => import('virtual:example-sources/routing'),
  'route-transitions': () =>
    import('virtual:example-sources/route-transitions'),
  'interrupting-commands': () =>
    import('virtual:example-sources/interrupting-commands'),
  'view-transitions': () => import('virtual:example-sources/view-transitions'),
  'query-sync': () => import('virtual:example-sources/query-sync'),
  'shopping-cart': () => import('virtual:example-sources/shopping-cart'),
  'state-machine': () => import('virtual:example-sources/state-machine'),
  auth: () => import('virtual:example-sources/auth'),
  'pixel-art': () => import('virtual:example-sources/pixel-art'),
  snake: () => import('virtual:example-sources/snake'),
  'crash-view': () => import('virtual:example-sources/crash-view'),
  're-render-outlines': () =>
    import('virtual:example-sources/re-render-outlines'),
  'slow-warnings': () => import('virtual:example-sources/slow-warnings'),
  'websocket-chat': () => import('virtual:example-sources/websocket-chat'),
  'managed-resource-layer': () =>
    import('virtual:example-sources/managed-resource-layer'),
  map: () => import('virtual:example-sources/map'),
  'canvas-art': () => import('virtual:example-sources/canvas-art'),
  'generative-art': () => import('virtual:example-sources/generative-art'),
  'web-components': () => import('virtual:example-sources/web-components'),
  embedding: () => import('virtual:example-sources/embedding'),
  ssg: () => import('virtual:example-sources/ssg'),
  ssr: () => import('virtual:example-sources/ssr'),
  'ui-showcase': () => import('virtual:example-sources/ui-showcase'),
  'personal-blog': () => import('virtual:example-sources/personal-blog'),
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
