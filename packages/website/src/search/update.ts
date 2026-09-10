import { Array, Effect, Match, Number, Option, Schema, String } from 'effect'
import { Command, Update } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import { Message, SearchResult } from './message'
import type { Model } from './model'
import { SearchState, resultsFromState } from './model'
import { PagefindService } from './pagefind'

const MAX_RESULTS = 8

export const SEARCH_INPUT_ID = 'search-input'
export const KEYBOARD_WARMUP_INPUT_ID = 'search-keyboard-warmup'

const SEARCH_RESULT_SELECTOR = '[data-search-result-index='

export const FetchSearchResults = Command.define('FetchSearchResults', {
  args: { query: Schema.String },
  messages: [Message.CompletedFetchSearchResults],
  execute: ({ query }) =>
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
    ),
})

export const ScrollToResult = Command.define('ScrollToResult', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollToResult],
  execute: ({ index }) =>
    Dom.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollToResult()),
    ),
})

export const NavigateToResult = Command.define('NavigateToResult', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateToResult],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateToResult())),
})

export const FocusSearchInput = Command.define('FocusSearchInput', {
  messages: [Message.CompletedFocusSearchInput],
  execute: Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusSearchInput()),
  ),
})

export type UpdateReturn = Update.Return<Model, Message, PagefindService>

const foldSearchDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldSearchDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

const foldSearchDialogOpen: Update.Step<Model, Message> = Update.foldChildStep({
  update: Dialog.open,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

const foldSearchDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotSearchDialogMessage({ message }),
  foldOutMessage: foldSearchDialogOutMessage,
})

export const open = (model: Model): UpdateReturn =>
  Update.combine(model, [
    foldSearchDialogOpen,
    stepModel => ({
      model: stepModel,
      commands: [FocusSearchInput()],
    }),
  ])

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSearchQuery: ({ query }) => {
      if (query === model.query) {
        return { model }
      }

      if (String.isEmpty(query)) {
        return {
          model: evo(model, {
            query: () => '',
            searchState: () => SearchState.Idle(),
            activeResultIndex: () => -1,
          }),
        }
      }

      const previousResults = resultsFromState(model.searchState)

      return {
        model: evo(model, {
          query: () => query,
          searchState: () => SearchState.Loading({ results: previousResults }),
          activeResultIndex: () => -1,
        }),
        commands: [FetchSearchResults({ query })],
      }
    },

    CompletedFetchSearchResults: ({ results, query }) => {
      if (query !== model.query) {
        return { model }
      }

      return {
        model: evo(model, {
          searchState: () => SearchState.Ok({ results }),
          activeResultIndex: () => 0,
        }),
      }
    },

    SelectedSearchResult: ({ url }) => ({
      model: evo(model, {
        query: () => '',
        searchState: () => SearchState.Idle(),
        activeResultIndex: () => -1,
      }),
      commands: [NavigateToResult({ url })],
    }),

    GotSearchDialogMessage: ({ message }) =>
      Update.combine(model, [
        foldSearchDialog(message),
        stepModel =>
          message._tag === 'CompletedCloseDialog'
            ? {
                model: evo(stepModel, {
                  query: () => '',
                  searchState: () => SearchState.Idle(),
                  activeResultIndex: () => -1,
                }),
              }
            : { model: stepModel },
      ]),

    ClearedSearchQuery: () => ({
      model: evo(model, {
        query: () => '',
        searchState: () => SearchState.Idle(),
        activeResultIndex: () => -1,
      }),
    }),

    PressedArrowKey: ({ direction }) => {
      const results = resultsFromState(model.searchState)
      const lastIndex = results.length - 1

      const nextIndex = Match.value(direction).pipe(
        Match.when('Up', () =>
          model.activeResultIndex <= 0
            ? lastIndex
            : Number.decrement(model.activeResultIndex),
        ),
        Match.when('Down', () =>
          model.activeResultIndex >= lastIndex
            ? 0
            : Number.increment(model.activeResultIndex),
        ),
        Match.exhaustive,
      )

      return {
        model: evo(model, { activeResultIndex: () => nextIndex }),
        commands: [ScrollToResult({ index: nextIndex })],
      }
    },

    CompletedNavigateToResult: () => ({ model }),
    CompletedScrollToResult: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
  })

export const informRouteChanged = (model: Model): UpdateReturn =>
  Update.combine(model, [
    stepModel => update(stepModel, Message.ClearedSearchQuery()),
    foldSearchDialogClose,
  ])
