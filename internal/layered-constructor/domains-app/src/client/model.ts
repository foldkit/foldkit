import { Schema } from 'effect'

import { DialogBlock } from '@foldkit/ui'

import { DomainCandidateRange } from '../shared/domain'
import { AvailabilityFilter, Cart, SortOrder, TldFilter } from './domain'
import { DomainsQuery } from './domainsQuery'
import {
  AvailabilityListboxBlock,
  SortListboxBlock,
  TldListboxBlock,
} from './filterListboxes'
import { ResultsListBlock } from './resultsList'
import { ApplicationRoute } from './route'
import { SearchLayout } from './searchInput'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  searchLayout: SearchLayout,
  searchGeneration: Schema.Number,
  selectedDomainRanges: Schema.Array(DomainCandidateRange),
  domainsQuery: DomainsQuery.Model,
  resultsList: ResultsListBlock.Model,
  tldListbox: TldListboxBlock.Model,
  availabilityListbox: AvailabilityListboxBlock.Model,
  sortListbox: SortListboxBlock.Model,
  tldFilter: TldFilter,
  availabilityFilter: AvailabilityFilter,
  sortOrder: SortOrder,
  cart: Cart.Cart,
  cartDialog: DialogBlock.Model,
  filtersDialog: DialogBlock.Model,
  tldDialog: DialogBlock.Model,
  tldSearchQuery: Schema.String,
})
export type Model = typeof Model.Type
