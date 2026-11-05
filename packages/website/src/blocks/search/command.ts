import { Array, Effect, Schema } from 'effect'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'

import { PagefindService } from '../../pagefind'
import { SEARCH_INPUT_ID } from '../../searchDom'
import { makeCommand } from './block'
import { SearchResult } from './domain'
import { Message } from './message'

const MAX_RESULTS = 8

const SEARCH_RESULT_SELECTOR = '[data-search-result-index='

export const FetchSearchResults = makeCommand('FetchSearchResults', {
  args: { query: Schema.String },
  messages: [Message.CompletedFetchSearchResults],
  handler: function* () {
    const pagefind = yield* PagefindService

    return ({ query }) =>
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
  },
})

export const ScrollToResult = makeCommand('ScrollToResult', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollToResult],
  handler: function* () {
    return ({ index }) =>
      Dom.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedScrollToResult()),
      )
  },
})

export const NavigateToResult = makeCommand('NavigateToResult', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateToResult],
  handler: function* () {
    return ({ url }) =>
      pushUrl(url).pipe(Effect.as(Message.CompletedNavigateToResult()))
  },
})

export const FocusSearchInput = makeCommand('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusSearchInput()),
      )
  },
})
