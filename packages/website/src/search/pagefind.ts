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

type PagefindModule = Readonly<{
  search: (query: string) => Promise<PagefindResponse>
}>

const PAGEFIND_PATH = '/pagefind/pagefind.js'

const NOOP_PAGEFIND: PagefindModule = {
  search: () => Promise.resolve({ results: [] }),
}

export class PagefindService extends Context.Service<
  PagefindService,
  PagefindModule
>()('PagefindService') {
  static readonly Default = Layer.effect(
    this,
    Effect.tryPromise({
      try: (): Promise<PagefindModule> =>
        new Function('path', 'return import(path)')(PAGEFIND_PATH),
      catch: () => new Error('Pagefind not available'),
    }).pipe(Effect.catch(() => Effect.succeed(NOOP_PAGEFIND))),
  )
}
