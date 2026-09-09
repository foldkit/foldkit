import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

export const SearchResult = Schema.Struct({
  url: Schema.String,
  title: Schema.String,
  excerpt: Schema.String,
  section: Schema.String,
  kind: Schema.String,
})

export const Message = defineMessageUnion({
  UpdatedSearchQuery: { query: Schema.String },
  CompletedFetchSearchResults: {
    results: Schema.Array(SearchResult),
    query: Schema.String,
  },
  SelectedSearchResult: { url: Schema.String },
  GotSearchDialogMessage: { message: Dialog.Message },
  ClearedSearchQuery: {},
  CompletedNavigateToResult: {},
  CompletedScrollToResult: {},
  CompletedFocusSearchInput: {},
  PressedArrowKey: { direction: Schema.Literals(['Up', 'Down']) },
})
export type Message = typeof Message.Type
