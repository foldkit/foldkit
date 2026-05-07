import { Array, Context, Effect, Layer, Schema as S } from 'effect'
import { Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'

import {
  CompletedFocusSearchInput,
  CompletedNavigateToResult,
  CompletedScrollToResult,
  ReceivedSearchResults,
  SearchResult,
} from './message'

const MAX_RESULTS = 8

const SEARCH_INPUT_ID = 'search-input'
const SEARCH_RESULT_SELECTOR = '[data-search-result-index='

type PagefindResult = Readonly<{
  data: () => Promise<
    Readonly<{
      url: string
      excerpt: string
      meta?: Readonly<{ title?: string; section?: string }>
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

export const FetchSearchResults = Command.define(
  'FetchSearchResults',
  { query: S.String },
  ReceivedSearchResults,
)(({ query }) =>
  Effect.gen(function* () {
    const pagefind = yield* PagefindService

    const searchResponse = yield* Effect.tryPromise({
      try: () => pagefind.search(query),
      catch: () => new Error('Pagefind search failed'),
    })

    const topResults = Array.take(searchResponse.results, MAX_RESULTS)

    const loadedResults = yield* Effect.tryPromise({
      try: () => Promise.all(topResults.map(result => result.data())),
      catch: () => new Error('Failed to load result data'),
    })

    const results = Array.map(loadedResults, data =>
      SearchResult.make({
        url: data.url,
        title: data.meta?.title ?? 'Untitled',
        excerpt: data.excerpt,
        section: data.meta?.section ?? '',
      }),
    )

    return ReceivedSearchResults({ results, query })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(ReceivedSearchResults({ results: [], query })),
    ),
  ),
)

export const ScrollToResult = Command.define(
  'ScrollToResult',
  { index: S.Number },
  CompletedScrollToResult,
)(({ index }) =>
  Dom.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
    Effect.ignore,
    Effect.as(CompletedScrollToResult()),
  ),
)

export const NavigateToResult = Command.define(
  'NavigateToResult',
  { url: S.String },
  CompletedNavigateToResult,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateToResult())))

export const FocusSearchInput = Command.define(
  'FocusSearchInput',
  CompletedFocusSearchInput,
)(
  Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusSearchInput()),
  ),
)

export { SEARCH_INPUT_ID }
