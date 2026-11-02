import { Listbox } from '@foldkit/ui'

import { AvailabilityFilter, SortOrder, TldFilter } from './domain'

export const TldListboxBlock = Listbox.makeBlock<TldFilter>()
export const AvailabilityListboxBlock = Listbox.makeBlock<AvailabilityFilter>()
export const SortListboxBlock = Listbox.makeBlock<SortOrder>()

export const TLD_FILTER_ID = 'tld-filter'
export const AVAILABILITY_FILTER_ID = 'availability-filter'
export const SORT_ORDER_ID = 'sort-order'
