import { Match as M, Number, String } from 'effect'
import { Command, type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  type PagefindService,
  ScrollToResult,
} from './command'
import { Message } from './message'
import type { Model } from './model'
import { Idle, Loading, Ok, resultsFromState } from './model'

export type UpdateReturn = Update.Return<Model, Message, PagefindService>

const openSearchDialog = (model: Model): UpdateReturn => {
  const dialogOpen = Dialog.open(model.dialog)

  return {
    model: evo(model, { dialog: () => dialogOpen.model }),
    commands: [
      ...Command.mapMessages(
        dialogOpen.commands ?? [],
        (message): Message => Message.GotSearchDialogMessage({ message }),
      ),
      FocusSearchInput(),
    ],
  }
}

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
            searchState: () => Idle(),
            activeResultIndex: () => -1,
          }),
        }
      }

      const previousResults = resultsFromState(model.searchState)

      return {
        model: evo(model, {
          query: () => query,
          searchState: () => Loading({ results: previousResults }),
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
          searchState: () => Ok({ results }),
          activeResultIndex: () => 0,
        }),
      }
    },

    SelectedSearchResult: ({ url }) => ({
      model: evo(model, {
        query: () => '',
        searchState: () => Idle(),
        activeResultIndex: () => -1,
      }),
      commands: [NavigateToResult({ url })],
    }),

    ClickedOpenSearch: () => openSearchDialog(model),

    PressedSearchShortcut: () => openSearchDialog(model),

    GotSearchDialogMessage: ({ message }) => {
      const dialogUpdate = Dialog.update(model.dialog, message)

      const resetOnClose =
        message._tag === 'CompletedCloseDialog'
          ? {
              query: () => '',
              searchState: () => Idle(),
              activeResultIndex: () => -1,
            }
          : {}

      const mappedDialogCommands = Command.mapMessages(
        dialogUpdate.commands ?? [],
        (message): Message => Message.GotSearchDialogMessage({ message }),
      )

      return {
        model: evo(model, {
          dialog: () => dialogUpdate.model,
          ...resetOnClose,
        }),
        commands: mappedDialogCommands,
      }
    },

    ClearedSearchQuery: () => ({
      model: evo(model, {
        query: () => '',
        searchState: () => Idle(),
        activeResultIndex: () => -1,
      }),
    }),

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

      return {
        model: evo(model, { activeResultIndex: () => nextIndex }),
        commands: [ScrollToResult({ index: nextIndex })],
      }
    },

    CompletedNavigateToResult: () => ({ model }),
    CompletedScrollToResult: () => ({ model }),
    CompletedFocusSearchInput: () => ({ model }),
  })

export const informRouteChanged = (model: Model): UpdateReturn => {
  const dialogClose = Dialog.close(model.dialog)
  const updateResult = update(model, Message.ClearedSearchQuery())
  return {
    model: evo(updateResult.model, { dialog: () => dialogClose.model }),
    commands: Command.mapMessages(
      dialogClose.commands ?? [],
      (message): Message => Message.GotSearchDialogMessage({ message }),
    ),
  }
}
