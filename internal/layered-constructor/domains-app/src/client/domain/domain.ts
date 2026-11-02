import {
  Array,
  Match,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  String,
  pipe,
} from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  type AvailableDomain,
  Domain,
  DomainCandidateRange,
  DomainName,
  domainCandidates,
  domainTlds,
  queryToMaybeDomainLabel,
} from '../../shared/domain'

export const DomainListing = defineTaggedUnion({
  Pending: DomainName.fields,
  Ready: { ...DomainName.fields, domain: Domain },
})
export type DomainListing = typeof DomainListing.Type

export const domainToReadyListing = (domain: Domain) =>
  DomainListing.Ready({ name: domain.name, tld: domain.tld, domain })

export const TldFilter = Schema.Literals([
  'All',
  ...Array.map(domainTlds, String.capitalize),
])
export type TldFilter = typeof TldFilter.Type

export const AvailabilityFilter = Schema.Literals(['All', 'Available'])
export type AvailabilityFilter = typeof AvailabilityFilter.Type

export const SortOrder = Schema.Literals([
  'Relevance',
  'Length',
  'PriceAscending',
  'PriceDescending',
  'Alphabetical',
])
export type SortOrder = typeof SortOrder.Type

export const isCompleteCatalogRequired = (
  availabilityFilter: AvailabilityFilter,
  sortOrder: SortOrder,
): boolean =>
  availabilityFilter === 'Available' ||
  Match.value(sortOrder).pipe(
    Match.whenOr('Relevance', 'Length', 'Alphabetical', () => false),
    Match.whenOr('PriceAscending', 'PriceDescending', () => true),
    Match.exhaustive,
  )

const domainNameOrder = Order.mapInput(
  Order.String,
  (domain: DomainName) => domain.name,
)

const domainNameLengthOrder = Order.combine(
  Order.mapInput(Order.Number, (domain: DomainName) =>
    String.length(domain.name),
  ),
  domainNameOrder,
)

export const TOP_RESULT_COUNT = 4
export const DOMAIN_PAGE_SIZE = 60

export const findDomainRangeForTld = (
  tld: string,
): Option.Option<DomainCandidateRange> =>
  pipe(
    domainTlds,
    Array.findFirstIndex(candidate => candidate === tld),
    Option.map(index => {
      if (index < TOP_RESULT_COUNT) {
        return DomainCandidateRange.make({ offset: 0, limit: TOP_RESULT_COUNT })
      } else if (index < DOMAIN_PAGE_SIZE) {
        return DomainCandidateRange.make({
          offset: TOP_RESULT_COUNT,
          limit: DOMAIN_PAGE_SIZE - TOP_RESULT_COUNT,
        })
      } else {
        const offset = Math.floor(index / DOMAIN_PAGE_SIZE) * DOMAIN_PAGE_SIZE

        return DomainCandidateRange.make({
          offset,
          limit: Math.min(DOMAIN_PAGE_SIZE, domainTlds.length - offset),
        })
      }
    }),
  )

export const mergeDomainsByName = (
  previous: ReadonlyArray<Domain>,
  incoming: ReadonlyArray<Domain>,
) =>
  pipe(
    previous,
    Array.filter(
      domain =>
        !Array.some(
          incoming,
          incomingDomain => incomingDomain.name === domain.name,
        ),
    ),
    Array.appendAll(incoming),
  )

export const queryToDomainListings = (
  query: string,
  domains: ReadonlyArray<Domain>,
) => {
  const domainsByName = Record.fromIterableBy(domains, domain => domain.name)

  return Array.map(queryToPendingDomainListings(query), pending =>
    pipe(
      domainsByName,
      Record.get(pending.name),
      Option.match({ onNone: () => pending, onSome: domainToReadyListing }),
    ),
  )
}

// NOTE: Static landing HTML includes pending cards so bootstrap can fill
// query results before the client bundle runs.
export const queryToPendingDomainListings = (query: string) => {
  const label = Option.getOrElse(queryToMaybeDomainLabel(query), () => '')
  return Array.map(domainCandidates(label), DomainListing.Pending)
}

export const matchesTldFilter =
  (tldFilter: TldFilter) =>
  (domain: DomainName): boolean =>
    tldFilter === 'All' || domain.tld === String.toLowerCase(tldFilter)

const matchesAvailabilityFilter =
  (availabilityFilter: AvailabilityFilter) =>
  (domain: Domain): boolean =>
    Match.value(availabilityFilter).pipe(
      Match.when('All', () => true),
      Match.when('Available', () => domain._tag === 'Available'),
      Match.exhaustive,
    )

export const filterAndSortDomains = (
  domains: ReadonlyArray<Domain>,
  tldFilter: TldFilter,
  availabilityFilter: AvailabilityFilter,
  sortOrder: SortOrder,
): ReadonlyArray<Domain> => {
  const filteredDomains = Array.filter(
    domains,
    Predicate.and(
      matchesTldFilter(tldFilter),
      matchesAvailabilityFilter(availabilityFilter),
    ),
  )
  const priceOrder = Order.mapInput(
    Order.Number,
    (domain: AvailableDomain) => domain.price,
  )
  const availableDomains = Array.filter(
    filteredDomains,
    Domain.guards.Available,
  )
  const unconfirmedDomains = Array.filter(
    filteredDomains,
    Domain.guards.Unconfirmed,
  )

  return Match.value(sortOrder).pipe(
    Match.when('Relevance', () => filteredDomains),
    Match.when('Length', () =>
      Array.sort(filteredDomains, domainNameLengthOrder),
    ),
    Match.when('Alphabetical', () =>
      Array.sort(filteredDomains, domainNameOrder),
    ),
    Match.when('PriceAscending', () =>
      Array.appendAll(
        Array.sort(availableDomains, priceOrder),
        unconfirmedDomains,
      ),
    ),
    Match.when('PriceDescending', () =>
      Array.appendAll(
        Array.sort(availableDomains, Order.flip(priceOrder)),
        unconfirmedDomains,
      ),
    ),
    Match.exhaustive,
  )
}

export const filterAndSortDomainListings = (
  query: string,
  domains: ReadonlyArray<Domain>,
  tldFilter: TldFilter,
  availabilityFilter: AvailabilityFilter,
  sortOrder: SortOrder,
): ReadonlyArray<DomainListing> => {
  const listings = Array.filter(
    queryToDomainListings(query, domains),
    listing => {
      const isAvailabilityMatch =
        availabilityFilter === 'All' ||
        listing._tag === 'Pending' ||
        listing.domain._tag === 'Available'

      return matchesTldFilter(tldFilter)(listing) && isAvailabilityMatch
    },
  )

  return Match.value(sortOrder).pipe(
    Match.when('Relevance', () => listings),
    Match.when('Length', () => Array.sort(listings, domainNameLengthOrder)),
    Match.when('Alphabetical', () => Array.sort(listings, domainNameOrder)),
    Match.whenOr('PriceAscending', 'PriceDescending', () =>
      Array.appendAll(
        Array.map(
          filterAndSortDomains(
            domains,
            tldFilter,
            availabilityFilter,
            sortOrder,
          ),
          domainToReadyListing,
        ),
        Array.filter(listings, DomainListing.guards.Pending),
      ),
    ),
    Match.exhaustive,
  )
}

export const formatPrice = (price: number): string => `$${price.toFixed(2)}`

export const formatRegistrationPrice = (domain: AvailableDomain): string =>
  domain.years === 1
    ? formatPrice(domain.price)
    : `${formatPrice(domain.price)} / ${domain.years} years`

export const formatRenewalPrice = (domain: AvailableDomain): string =>
  `Renews at ${formatPrice(domain.renewalPrice)} for ${domain.years === 1 ? '1 year' : `${domain.years} years`}`
