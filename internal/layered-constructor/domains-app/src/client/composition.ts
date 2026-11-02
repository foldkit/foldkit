import type { ViewBuilderFor } from 'foldkit/experimental/layered'

import {
  AvailabilityListboxBlock,
  DialogBlock,
  DomainsQueryBlock,
  ResultsListBlock,
  SortListboxBlock,
  TldListboxBlock,
} from './children'
import {
  FocusCartButton,
  FocusFiltersButton,
  FocusTldFilterButton,
} from './command'
import {
  makeBinding,
  makeCommandsStep,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
} from './definition'
import {
  AVAILABILITY_FILTER_ID,
  SORT_ORDER_ID,
  TLD_FILTER_ID,
} from './filterListboxes'
import { resultsListConfig } from './resultsList'
import {
  continueSearchAfterDomainRequest,
  requestNextDomainRange,
} from './steps/domainRequests'
import {
  updateAvailabilityFilter,
  updateSortOrder,
  updateTldFilter,
} from './steps/filters'

export const ResultsListBinding = makeBinding(ResultsListBlock, {
  field: 'resultsList',
  init: {
    contextToArgs: () => [resultsListConfig],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ResultsListBlock, {
    ObservedContainerScroll: () => requestNextDomainRange,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  }),
})

export const CART_DIALOG_ID = 'domains-cart'

export const CartDialogBinding = makeBinding(DialogBlock, {
  field: 'cartDialog',
  init: { contextToArgs: () => [{ id: CART_DIALOG_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => makeCommandsStep(() => [FocusCartButton()]),
  }),
})

export const FILTERS_DIALOG_ID = 'domains-filters'

export const FiltersDialogBinding = makeBinding(DialogBlock, {
  field: 'filtersDialog',
  init: { contextToArgs: () => [{ id: FILTERS_DIALOG_ID, isAnimated: true }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => makeCommandsStep(() => [FocusFiltersButton()]),
  }),
})

export const TLD_DIALOG_ID = 'domains-tld-filter'

export const TldDialogBinding = makeBinding(DialogBlock, {
  field: 'tldDialog',
  init: { contextToArgs: () => [{ id: TLD_DIALOG_ID, isAnimated: true }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => makeCommandsStep(() => [FocusTldFilterButton()]),
  }),
})

export const DomainsQueryBinding = makeBinding(DomainsQueryBlock, {
  field: 'domainsQuery',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DomainsQueryBlock, {
    CompletedFetch: continueSearchAfterDomainRequest,
  }),
})

export const TldListboxBinding = makeBinding(TldListboxBlock, {
  field: 'tldListbox',
  init: { contextToArgs: () => [{ id: TLD_FILTER_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(TldListboxBlock, {
    Selected: ({ value }) => updateTldFilter(value),
  }),
})

export const AvailabilityListboxBinding = makeBinding(
  AvailabilityListboxBlock,
  {
    field: 'availabilityListbox',
    init: { contextToArgs: () => [{ id: AVAILABILITY_FILTER_ID }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(AvailabilityListboxBlock, {
    Selected: ({ value }) => updateAvailabilityFilter(value),
  }),
})

export const SortListboxBinding = makeBinding(SortListboxBlock, {
  field: 'sortListbox',
  init: { contextToArgs: () => [{ id: SORT_ORDER_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SortListboxBlock, {
    Selected: ({ value }) => updateSortOrder(value),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [
    ResultsListBinding,
    CartDialogBinding,
    FiltersDialogBinding,
    TldDialogBinding,
    DomainsQueryBinding,
    TldListboxBinding,
    AvailabilityListboxBinding,
    SortListboxBinding,
  ],
})
export type ApplicationViewBuilder = ViewBuilderFor<
  typeof ApplicationComposition
>
