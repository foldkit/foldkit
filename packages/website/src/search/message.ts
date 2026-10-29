import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { SearchResult } from './domain'

export const Message = defineMessageUnion({
  UpdatedSearchQuery: { query: Schema.String },
  CompletedFetchSearchResults: {
    results: Schema.Array(SearchResult),
    query: Schema.String,
  },
  SelectedSearchResult: { url: Schema.String },
  ClearedSearchQuery: {},
  RequestedOpen: {},
  InformedOfRouteChange: {},
  CompletedNavigateToResult: {},
  CompletedScrollToResult: {},
  CompletedFocusSearchInput: {},
  PressedArrowKey: { direction: Schema.Literals(['Up', 'Down']) },
})
export type Message = typeof Message.Type
