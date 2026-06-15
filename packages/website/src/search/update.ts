import { Dialog } from '@foldkit/ui'
import { Match as M, Number, String } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  type PagefindService,
  ScrollToResult,
} from './command'
import {
  ClearedSearchQuery,
  GotSearchDialogMessage,
  type Message,
} from './message'
import type { Model } from './model'
import { Idle, Loading, Ok, resultsFromState } from './model'

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, PagefindService>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const openSearchDialog = (model: Model): UpdateReturn => {
  const [nextDialog, dialogCommands] = Dialog.open(model.dialog)

  return [
    evo(model, { dialog: () => nextDialog }),
    [
      ...Command.mapMessages(
        dialogCommands,
        (message): Message => GotSearchDialogMessage({ message }),
      ),
      FocusSearchInput(),
    ],
  ]
}

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

      ClickedOpenSearch: () => openSearchDialog(model),

      PressedSearchShortcut: () => openSearchDialog(model),

      GotSearchDialogMessage: ({ message }) => {
        const [nextDialog, dialogCommands] = Dialog.update(
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

        const mappedDialogCommands = Command.mapMessages(
          dialogCommands,
          (message): Message => GotSearchDialogMessage({ message }),
        )

        return [
          evo(model, { dialog: () => nextDialog, ...resetOnClose }),
          mappedDialogCommands,
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

export const informRouteChanged = (model: Model): UpdateReturn => {
  const [closedDialog, closeCommands] = Dialog.close(model.dialog)
  const [clearedModel] = update(model, ClearedSearchQuery())
  return [
    evo(clearedModel, { dialog: () => closedDialog }),
    Command.mapMessages(
      closeCommands,
      (message): Message => GotSearchDialogMessage({ message }),
    ),
  ]
}
