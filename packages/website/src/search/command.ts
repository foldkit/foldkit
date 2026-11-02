import { Array, Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import type { PagefindModule } from '../pagefind'
import { SearchResult } from './domain'
import { Message } from './message'

const MAX_RESULTS = 8

export const FetchSearchResults = Command.define('FetchSearchResults', {
  args: { query: Schema.String },
  messages: [Message.CompletedFetchSearchResults],
})

export const ScrollToResult = Command.define('ScrollToResult', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollToResult],
})

export const NavigateToResult = Command.define('NavigateToResult', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateToResult],
})

export const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
})

export const fetchSearchResults = (pagefind: PagefindModule, query: string) =>
  Effect.gen(function* () {
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
        kind: data.meta?.kind ?? '',
      }),
    )

    return Message.CompletedFetchSearchResults({ results, query })
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(
        Message.CompletedFetchSearchResults({ results: [], query }),
      ),
    ),
  )
