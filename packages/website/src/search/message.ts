import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

export const SearchResult = S.Struct({
  url: S.String,
  title: S.String,
  excerpt: S.String,
  section: S.String,
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
  message: Ui.Dialog.Message,
})
export const ClearedSearchQuery = m('ClearedSearchQuery')
export const CompletedNavigateSearch = m('CompletedNavigateSearch')
export const CompletedScrollToResult = m('CompletedScrollToResult')
export const PressedArrowKey = m('PressedArrowKey', {
  direction: S.Literal('Up', 'Down'),
})

export const Message = S.Union(
  UpdatedSearchQuery,
  ReceivedSearchResults,
  SelectedSearchResult,
  GotSearchDialogMessage,
  ClearedSearchQuery,
  CompletedNavigateSearch,
  CompletedScrollToResult,
  PressedArrowKey,
)
export type Message = typeof Message.Type
