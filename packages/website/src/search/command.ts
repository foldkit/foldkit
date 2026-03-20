import { Array, Effect } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import * as Task from 'foldkit/task'

import {
  CompletedResultScroll,
  CompletedSearchNavigation,
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

export class PagefindService extends Effect.Service<PagefindService>()(
  'PagefindService',
  {
    effect: Effect.tryPromise({
      try: (): Promise<PagefindModule> =>
        new Function('path', 'return import(path)')(PAGEFIND_PATH),
      catch: () => new Error('Pagefind not available'),
    }).pipe(Effect.catchAll(() => Effect.succeed(NOOP_PAGEFIND))),
  },
) {}

export const searchPagefind = (
  query: string,
): Command.Command<typeof ReceivedSearchResults, never, PagefindService> =>
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
    Effect.catchAll(() =>
      Effect.succeed(ReceivedSearchResults({ results: [], query })),
    ),
    Command.make('FetchSearchIndex'),
  )

export const scrollActiveResultIntoView = (
  index: number,
): Command.Command<typeof CompletedResultScroll> =>
  Task.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
    Effect.ignore,
    Effect.as(CompletedResultScroll()),
    Command.make('ScrollToResult'),
  )

export const navigateToResult = (
  url: string,
): Command.Command<typeof CompletedSearchNavigation> =>
  pushUrl(url).pipe(
    Effect.as(CompletedSearchNavigation()),
    Command.make('NavigateToResult'),
  )

export { SEARCH_INPUT_ID }
