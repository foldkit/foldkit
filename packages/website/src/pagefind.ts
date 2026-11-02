import { Context, Effect, Layer } from 'effect'

type PagefindResult = Readonly<{
  data: () => Promise<
    Readonly<{
      url: string
      excerpt: string
      meta?: Readonly<{ title?: string; section?: string; kind?: string }>
    }>
  >
}>

type PagefindResponse = Readonly<{
  results: ReadonlyArray<PagefindResult>
}>

export type PagefindModule = Readonly<{
  search: (query: string) => Promise<PagefindResponse>
}>

const PAGEFIND_PATH = '/pagefind/pagefind.js'

export const unavailablePagefind: PagefindModule = {
  search: () => Promise.resolve({ results: [] }),
}

export class PagefindService extends Context.Service<
  PagefindService,
  PagefindModule
>()('PagefindService') {}

export const PagefindLayer = Layer.effect(
  PagefindService,
  Effect.tryPromise({
    try: (): Promise<PagefindModule> =>
      new Function('path', 'return import(path)')(PAGEFIND_PATH),
    catch: () => new Error('Pagefind not available'),
  }).pipe(Effect.catch(() => Effect.succeed(unavailablePagefind))),
)
