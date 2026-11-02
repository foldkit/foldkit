import { Array, Option, Result } from 'effect'
import { Url } from 'foldkit'
import { Command } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui'

import { Domain, domainTlds, queryToMaybeDomainLabel } from '../shared/domain'
import { makeDomainFixtures } from '../shared/domain.fixture'
import { CART_DIALOG_ID, FILTERS_DIALOG_ID, TLD_DIALOG_ID } from './composition'
import { DomainsQuery, DomainsQueryArgs } from './domainsQuery'
import {
  AVAILABILITY_FILTER_ID,
  AvailabilityListboxBlock,
  SORT_ORDER_ID,
  SortListboxBlock,
  TLD_FILTER_ID,
  TldListboxBlock,
} from './filterListboxes'
import { Model } from './model'
import { ResultsListBlock, resultsListConfig } from './resultsList'
import { ApplicationRoute } from './route'

export const emptyModel = Model.make({
  route: ApplicationRoute.Search({ q: Option.none() }),
  searchLayout: 'Landing',
  searchGeneration: 0,
  selectedDomainRanges: [],
  domainsQuery: DomainsQuery.init().model,
  resultsList: ResultsListBlock.init(resultsListConfig).model,
  tldListbox: TldListboxBlock.init({ id: TLD_FILTER_ID }).model,
  availabilityListbox: AvailabilityListboxBlock.init({
    id: AVAILABILITY_FILTER_ID,
  }).model,
  sortListbox: SortListboxBlock.init({ id: SORT_ORDER_ID }).model,
  tldFilter: 'All',
  tldSearchQuery: '',
  availabilityFilter: 'All',
  sortOrder: 'Relevance',
  cart: [],
  cartDialog: DialogBlock.init({ id: CART_DIALOG_ID }).model,
  tldDialog: DialogBlock.init({ id: TLD_DIALOG_ID, isAnimated: true }).model,
  filtersDialog: DialogBlock.init({ id: FILTERS_DIALOG_ID, isAnimated: true })
    .model,
})

export const withDomainsForRange = (
  model: Model,
  args: DomainsQueryArgs,
  domains: ReadonlyArray<Domain>,
  completedAtMillis = 0,
): Model => {
  const domainsLoad = DomainsQuery.requestRevalidationOrLoad(
    model.domainsQuery,
    args,
  )
  const fetchArgs = Option.getOrThrow(
    Array.findFirst(
      Array.getSomes(
        Array.map(
          domainsLoad.commands ?? [],
          Command.argsOf(DomainsQuery.Fetch),
        ),
      ),
      () => true,
    ),
  )
  const domainsCompletion = DomainsQuery.update(
    domainsLoad.model,
    DomainsQuery.Message.CompletedFetch({
      ...fetchArgs,
      result: Result.succeed(domains),
      completedAtMillis,
    }),
  )

  return modifyFields(model, {
    domainsQuery: () => domainsCompletion.model,
    selectedDomainRanges: ranges =>
      Array.some(
        ranges,
        range => range.offset === args.offset && range.limit === args.limit,
      )
        ? ranges
        : Array.append(ranges, { offset: args.offset, limit: args.limit }),
  })
}

export const readyModel = (query: string): Model =>
  withDomainsForRange(
    modifyFields(emptyModel, {
      route: () => ApplicationRoute.Search({ q: Option.some(query) }),
      searchGeneration: () => 1,
      searchLayout: () => 'Search',
    }),
    {
      label: Option.getOrThrow(queryToMaybeDomainLabel(query)),
      offset: 0,
      limit: domainTlds.length,
    },
    makeDomainFixtures(Option.getOrThrow(queryToMaybeDomainLabel(query))),
  )

export const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    Url.fromString(raw),
    () => new Error(`Failed to parse URL: ${raw}`),
  )
