import { Dialog } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const SearchResult = S.Struct({
  url: S.String,
  title: S.String,
  excerpt: S.String,
  section: S.String,
  kind: S.String,
})

export const UpdatedSearchQuery = m('UpdatedSearchQuery', {
  query: S.String,
})
export const ReceivedSearchResults = m('ReceivedSearchResults', {
  results: S.Array(SearchResult),
  query: S.String,
})
export const SelectedSearchResult = m('SelectedSearchResult', {
  url: S.String,
})
export const GotSearchDialogMessage = m('GotSearchDialogMessage', {
  message: Dialog.Message,
})
export const ClickedOpenSearch = m('ClickedOpenSearch')
export const PressedSearchShortcut = m('PressedSearchShortcut')
export const ClearedSearchQuery = m('ClearedSearchQuery')
export const CompletedNavigateToResult = m('CompletedNavigateToResult')
export const CompletedScrollToResult = m('CompletedScrollToResult')
export const CompletedFocusSearchInput = m('CompletedFocusSearchInput')
export const PressedArrowKey = m('PressedArrowKey', {
  direction: S.Literals(['Up', 'Down']),
})

export const Message = S.Union([
  UpdatedSearchQuery,
  ReceivedSearchResults,
  SelectedSearchResult,
  GotSearchDialogMessage,
  ClickedOpenSearch,
  PressedSearchShortcut,
  ClearedSearchQuery,
  CompletedNavigateToResult,
  CompletedScrollToResult,
  CompletedFocusSearchInput,
  PressedArrowKey,
])
export type Message = typeof Message.Type
