import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Domain, DomainCandidateRange } from '../shared/domain'
import { AvailabilityFilter, SortOrder, TldFilter } from './domain'
import { ResultsListScrollKey } from './resultsList'

export const Message = defineMessageUnion({
  UpdatedSearch: { value: Schema.String },
  SubmittedSearch: {},
  RequestedSearch: {},
  RequestedDomains: DomainCandidateRange.fields,
  PressedEscape: {},
  FocusedResultsList: {},
  PressedResultsListScrollKey: { key: ResultsListScrollKey },
  ClickedClearSearch: {},
  ChangedUrl: { url: Url },
  ClickedLink: { request: UrlRequest },
  ClickedDomainsHome: {},
  ClickedSkipToMain: {},
  UpdatedTldFilter: { value: TldFilter },
  UpdatedAvailabilityFilter: { value: AvailabilityFilter },
  UpdatedSortOrder: { value: SortOrder },
  ClickedAddDomain: { domain: Domain.Available },
  ClickedRemoveDomain: { name: Schema.String },
  ClickedRemoveCartDomain: { name: Schema.String },
  ClickedCart: {},
  ClickedFilters: {},
  ClickedTldFilter: {},
  UpdatedTldSearch: { value: Schema.String },
  ClickedMobileTldOption: { value: TldFilter },
  ClickedMobileAvailabilityOption: { value: AvailabilityFilter },
  ClickedMobileSortOption: { value: SortOrder },
  ClickedRetrySearch: {},
  CompletedReadCurrentTime: {
    searchGeneration: Schema.Number,
    nowMillis: Schema.Number,
    ...DomainCandidateRange.fields,
    isRefreshRequested: Schema.Boolean,
  },

  CompletedReplaceSearchUrl: {},
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedFocusSearchInput: {},
  CompletedFocusCartButton: {},
  CompletedFocusFiltersButton: {},
  CompletedFocusTldFilterButton: {},
  CompletedFocusCartCloseButton: {},
  CompletedScrollPage: {},
  CompletedScrollPageToTop: {},
  CompletedRevealResultsListStart: {},
  CompletedDismissSearchKeyboard: {},
  CompletedReleaseEarlySearchListeners: { isSearchStarted: Schema.Boolean },
})
export type Message = typeof Message.Type
export type ChangedUrlMessage = typeof Message.ChangedUrl.Type
export type ClickedRemoveCartDomainMessage =
  typeof Message.ClickedRemoveCartDomain.Type
export type CompletedReadCurrentTimeMessage =
  typeof Message.CompletedReadCurrentTime.Type
