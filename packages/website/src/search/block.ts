import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'

import { Dialog, DialogLive } from '@foldkit/ui'

import { PagefindService } from '../pagefind'
import { SEARCH_INPUT_ID } from '../searchDom'
import { clearSearchQueryStep } from './clear'
import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  ScrollToResult,
  fetchSearchResults,
} from './command'
import { SearchState } from './domain'
import { Message } from './message'
import { Model } from './model'
import {
  handleCompletedFetchSearchResults,
  handlePressedArrowKey,
  handleSelectedSearchResult,
  handleUpdatedSearchQuery,
} from './update'
import { view } from './view'

const SEARCH_RESULT_SELECTOR = '[data-search-result-index='

export class Search extends Block<Search>()('Search', {
  Model,
  Message,
  Command: [
    FetchSearchResults,
    ScrollToResult,
    NavigateToResult,
    FocusSearchInput,
  ],
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    const pagefind = yield* PagefindService
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'search-dialog' })

    return {
      model: {
        dialog,
        query: '',
        searchState: SearchState.Idle(),
        activeResultIndex: -1,
      },

      update: {
        UpdatedSearchQuery: handleUpdatedSearchQuery,
        CompletedFetchSearchResults: handleCompletedFetchSearchResults,
        SelectedSearchResult: handleSelectedSearchResult,
        ClearedSearchQuery: clearSearchQueryStep,
        RequestedOpen: model => ({
          model,
          commands: [FocusSearchInput()],
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
        InformedOfRouteChange: model => ({
          model: clearSearchQueryStep(model).model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedClose())],
        }),
        PressedArrowKey: handlePressedArrowKey,
        CompletedNavigateToResult: model => ({ model }),
        CompletedScrollToResult: model => ({ model }),
        CompletedFocusSearchInput: model => ({ model }),
        ...dialog.on({
          CompletedClose: model => clearSearchQueryStep(model),
        }),
      },

      commands: {
        FetchSearchResults: ({ query }) => fetchSearchResults(pagefind, query),
        ScrollToResult: ({ index }) =>
          Dom.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedScrollToResult()),
          ),
        NavigateToResult: ({ url }) =>
          pushUrl(url).pipe(Effect.as(Message.CompletedNavigateToResult())),
        FocusSearchInput: () =>
          Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusSearchInput()),
          ),
      },

      view,
    }
  }),
).pipe(Layer.provide(DialogLive))
