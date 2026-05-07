import { Effect, Match as M, Number, String } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  type PagefindService,
  ScrollToResult,
} from './command'
import { GotSearchDialogMessage, type Message } from './message'
import type { Model } from './model'
import { Idle, Loading, Ok, resultsFromState } from './model'

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, PagefindService>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      UpdatedSearchQuery: ({ query }) => {
        if (query === model.query) {
          return [model, []]
        }

        if (String.isEmpty(query)) {
          return [
            evo(model, {
              query: () => '',
              searchState: () => Idle(),
              activeResultIndex: () => -1,
            }),
            [],
          ]
        }

        const previousResults = resultsFromState(model.searchState)

        return [
          evo(model, {
            query: () => query,
            searchState: () => Loading({ results: previousResults }),
            activeResultIndex: () => -1,
          }),
          [FetchSearchResults({ query })],
        ]
      },

      ReceivedSearchResults: ({ results, query }) => {
        if (query !== model.query) {
          return [model, []]
        }

        return [
          evo(model, {
            searchState: () => Ok({ results }),
            activeResultIndex: () => 0,
          }),
          [],
        ]
      },

      SelectedSearchResult: ({ url }) => [
        evo(model, {
          query: () => '',
          searchState: () => Idle(),
          activeResultIndex: () => -1,
        }),
        [NavigateToResult({ url })],
      ],

      GotSearchDialogMessage: ({ message }) => {
        const [nextDialog, dialogCommands] = Ui.Dialog.update(
          model.dialog,
          message,
        )

        const resetOnClose =
          message._tag === 'CompletedCloseDialog'
            ? {
                query: () => '',
                searchState: () => Idle(),
                activeResultIndex: () => -1,
              }
            : {}

        const focusOnOpen =
          message._tag === 'Opened' ? [FocusSearchInput()] : []

        const mappedDialogCommands = dialogCommands.map(
          Command.mapEffect(
            Effect.map(
              (message): Message => GotSearchDialogMessage({ message }),
            ),
          ),
        )

        return [
          evo(model, { dialog: () => nextDialog, ...resetOnClose }),
          [...mappedDialogCommands, ...focusOnOpen],
        ]
      },

      ClearedSearchQuery: () => [
        evo(model, {
          query: () => '',
          searchState: () => Idle(),
          activeResultIndex: () => -1,
        }),
        [],
      ],

      PressedArrowKey: ({ direction }) => {
        const results = resultsFromState(model.searchState)
        const lastIndex = results.length - 1

        const nextIndex = M.value(direction).pipe(
          M.when('Up', () =>
            model.activeResultIndex <= 0
              ? lastIndex
              : Number.decrement(model.activeResultIndex),
          ),
          M.when('Down', () =>
            model.activeResultIndex >= lastIndex
              ? 0
              : Number.increment(model.activeResultIndex),
          ),
          M.exhaustive,
        )

        return [
          evo(model, { activeResultIndex: () => nextIndex }),
          [ScrollToResult({ index: nextIndex })],
        ]
      },

      CompletedNavigateToResult: () => [model, []],
      CompletedScrollToResult: () => [model, []],
      CompletedFocusSearchInput: () => [model, []],
    }),
  )
