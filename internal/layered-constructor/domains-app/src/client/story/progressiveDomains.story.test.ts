import { Array, Effect, Option } from 'effect'
import { Story } from 'foldkit/experimental/layered/testing'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { VirtualList } from '@foldkit/ui'

import { domainTlds } from '../../shared/domain'
import { makeDomainFixtures } from '../../shared/domain.fixture'
import { ApplicationBlock } from '../block'
import { FocusSearchInput, ReadCurrentTime } from '../command'
import { ResultsListBinding } from '../composition'
import { DomainListing, SortOrder } from '../domain'
import { DomainsQueryFailure } from '../domainsQuery'
import { Message } from '../message'
import { emptyModel, urlOrThrow, withDomainsForRange } from '../model.fixture'
import { resultListings } from '../resultListings'
import { ResultsListBlock } from '../resultsList'
import { ApplicationRoute } from '../route'
import {
  DomainRequestPresentation,
  SearchViewState,
  searchViewState,
} from '../searchViewState'
import {
  makeDomainsFetch,
  resolveDomainsFailure,
  resolveDomainsSuccess,
  resolveResultsListScrolls,
  resolveSearchTime,
} from './test'

const firstArgs = {
  label: 'acme',
  offset: 0,
  limit: 60,
}
const secondArgs = {
  label: 'acme',
  offset: 60,
  limit: 60,
}
const laterArgs = {
  label: 'acme',
  offset: 180,
  limit: 60,
}
const catalogArgs = {
  label: 'acme',
  offset: 0,
  limit: domainTlds.length,
}
const allDomains = makeDomainFixtures('acme')
const firstPageDomains = Array.take(allDomains, 60)
const secondPageDomains = Array.take(Array.drop(allDomains, 60), 60)
const laterPageDomains = Array.take(Array.drop(allDomains, 180), 60)
const partialModel = withDomainsForRange(
  modifyFields(emptyModel, {
    route: () => ApplicationRoute.Search({ q: Option.some('acme') }),
    searchGeneration: () => 1,
  }),
  firstArgs,
  firstPageDomains,
)
const pageFailure = DomainsQueryFailure.make({
  error: 'Sample service unavailable',
})

const scroll = (scrollTop: number) =>
  Story.messageIn(
    ResultsListBinding,
    ResultsListBlock.Message.ObservedContainerScroll({
      scrollTop,
      scrollHeight: 10_600,
      containerHeight: 400,
      anchor: VirtualList.ObservedAnchor.None(),
    }),
  )

const failPageAroundCriteriaChange = (
  criteriaMessage: Message,
  isBeforeFailure: boolean,
) =>
  isBeforeFailure
    ? Story.steps(
        Story.message(criteriaMessage),
        resolveDomainsFailure(secondArgs, 2, pageFailure, 20),
      )
    : Story.steps(
        resolveDomainsFailure(secondArgs, 2, pageFailure, 20),
        Story.message(criteriaMessage),
      )

describe('progressive domain results', () => {
  test.each(
    Array.filter(
      SortOrder.literals,
      sortOrder => sortOrder === 'Length' || sortOrder === 'Alphabetical',
    ),
  )(
    '%s sorts pending names immediately and retries only the visible candidate range',
    async sortOrder => {
      const topArgs = {
        label: 'acme',
        offset: 0,
        limit: 4,
      }
      const remainingArgs = {
        label: 'acme',
        offset: 4,
        limit: 56,
      }
      const loadingModel = modifyFields(emptyModel, {
        route: () => ApplicationRoute.Search({ q: Option.some('acme') }),
      })
      const expectedNames =
        sortOrder === 'Length'
          ? ['acme.ac', 'acme.ag', 'acme.ai', 'acme.am', 'acme.au']
          : [
              'acme.ac',
              'acme.academy',
              'acme.accountant',
              'acme.accountants',
              'acme.actor',
            ]

      await Effect.runPromise(
        Story.story(
          ApplicationBlock,
          Story.given(loadingModel),
          Story.message(Message.UpdatedSortOrder({ value: sortOrder })),
          Story.model(model => {
            const listings = resultListings(model)

            expect(
              Array.map(Array.take(listings, 5), listing => listing.name),
            ).toEqual(expectedNames)
            expect(Array.every(listings, DomainListing.guards.Pending)).toBe(
              true,
            )
          }),
          resolveResultsListScrolls,
          Story.Command.expectNone(),
          Story.message(Message.RequestedSearch()),
          resolveSearchTime(1, 0),
          Story.Command.expectHas(makeDomainsFetch(topArgs, 1)),
          resolveDomainsSuccess(topArgs, 1, Array.take(allDomains, 4), 5),
          Story.model(model => {
            const listings = resultListings(model)

            expect(
              Array.map(Array.take(listings, 5), listing => listing.name),
            ).toEqual(expectedNames)
            expect(Option.getOrThrow(Array.head(listings))).toEqual(
              DomainListing.Pending({ name: 'acme.ac', tld: 'ac' }),
            )
            expect(
              Array.findFirst(listings, listing => listing.name === 'acme.com'),
            ).toEqual(
              Option.some(
                DomainListing.Ready({
                  name: 'acme.com',
                  tld: 'com',
                  domain: Option.getOrThrow(Array.head(allDomains)),
                }),
              ),
            )
          }),
          resolveResultsListScrolls,
          Story.Command.expectExact(
            ReadCurrentTime({
              searchGeneration: 1,
              offset: 4,
              limit: 56,
              isRefreshRequested: false,
            }),
          ),
          resolveSearchTime(1, 10, 4, 56),
          resolveResultsListScrolls,
          Story.Command.expectExact(makeDomainsFetch(remainingArgs, 2)),
          resolveDomainsFailure(remainingArgs, 2, pageFailure, 20),
          Story.message(Message.ClickedRetrySearch()),
          Story.Command.resolve(
            FocusSearchInput,
            Message.CompletedFocusSearchInput(),
          ),
          resolveResultsListScrolls,
          Story.Command.expectExact(
            ReadCurrentTime({
              searchGeneration: 1,
              offset: 4,
              limit: 56,
              isRefreshRequested: true,
            }),
          ),
          resolveSearchTime(1, 30, 4, 56, true),
          resolveResultsListScrolls,
          Story.Command.expectExact(makeDomainsFetch(remainingArgs, 3)),
          resolveDomainsFailure(remainingArgs, 3, pageFailure, 40),
          resolveResultsListScrolls,
          Story.Command.expectNone(),
        ),
      )
    },
  )

  test('shows Top Results before the rest of the first page and ignores a duplicate planning Clock while pending', async () => {
    const topArgs = {
      label: 'acme',
      offset: 0,
      limit: 4,
    }
    const remainingArgs = {
      label: 'acme',
      offset: 4,
      limit: 56,
    }
    const topDomains = Array.take(allDomains, 4)

    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(emptyModel),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=acme') }),
        ),
        resolveSearchTime(1, 0),
        Story.Command.expectHas(makeDomainsFetch(topArgs, 1)),
        Story.message(Message.RequestedDomains({ offset: 0, limit: 4 })),
        resolveSearchTime(1, 1),
        Story.Command.expectHas(makeDomainsFetch(topArgs, 1)),
        resolveDomainsSuccess(topArgs, 1, topDomains, 10),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({ domains: topDomains }),
          )
        }),
        resolveSearchTime(1, 10, 4, 56),
        Story.Command.expectHas(makeDomainsFetch(remainingArgs, 2)),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({
              domains: topDomains,
              domainRequest: DomainRequestPresentation.Loading({
                offset: 4,
                limit: 56,
              }),
            }),
          )
        }),
        resolveDomainsSuccess(
          remainingArgs,
          2,
          Array.drop(firstPageDomains, 4),
          20,
        ),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({ domains: firstPageDomains }),
          )
        }),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })

  test('loads the latest viewport after the current page completes', async () => {
    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(partialModel),
        scroll(1140),
        resolveSearchTime(1, 10, 60, 60),
        Story.Command.expectHas(makeDomainsFetch(secondArgs, 2)),
        scroll(3762),
        resolveDomainsSuccess(secondArgs, 2, secondPageDomains, 20),
        Story.Command.expectHas(
          ReadCurrentTime({
            searchGeneration: 1,
            offset: 180,
            limit: 60,
            isRefreshRequested: false,
          }),
        ),
        resolveSearchTime(1, 30, 180, 60),
        Story.Command.expectHas(makeDomainsFetch(laterArgs, 3)),
        resolveDomainsSuccess(laterArgs, 3, laterPageDomains, 40),
        Story.model(model => {
          const viewState = searchViewState(model)
          expect(viewState._tag).toBe('Ready')

          if (viewState._tag === 'Ready') {
            expect(viewState.domains).toHaveLength(180)
            expect(viewState.domainRequest._tag).toBe('Idle')
          }
        }),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })

  test('a later failure preserves checked domain results, retries only that page, and global sort loads the catalog', async () => {
    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(partialModel),
        scroll(1140),
        resolveSearchTime(1, 10, 60, 60),
        resolveDomainsFailure(secondArgs, 2, pageFailure, 20),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({
              domains: firstPageDomains,
              domainRequest: DomainRequestPresentation.Failed({
                offset: 60,
                limit: 60,
                error: 'Sample service unavailable',
              }),
            }),
          )
        }),
        scroll(1140),
        Story.message(Message.ClickedRetrySearch()),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        resolveSearchTime(1, 30, 60, 60, true),
        Story.Command.expectHas(makeDomainsFetch(secondArgs, 3)),
        resolveDomainsSuccess(secondArgs, 3, secondPageDomains, 40),
        Story.message(Message.UpdatedSortOrder({ value: 'PriceAscending' })),
        resolveSearchTime(1, 50, 0, domainTlds.length),
        Story.Command.expectHas(makeDomainsFetch(catalogArgs, 4)),
        resolveDomainsSuccess(catalogArgs, 4, allDomains, 60),
        Story.model(model => {
          expect(model.sortOrder).toBe('PriceAscending')
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({ domains: allDomains }),
          )
        }),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })

  test.each([
    {
      criteria: 'price sorting',
      timing: 'before the page failure',
      message: Message.UpdatedSortOrder({ value: 'PriceAscending' }),
      isBeforeFailure: true,
    },
    {
      criteria: 'price sorting',
      timing: 'after the page failure',
      message: Message.UpdatedSortOrder({ value: 'PriceAscending' }),
      isBeforeFailure: false,
    },
    {
      criteria: 'availability filtering',
      timing: 'before the page failure',
      message: Message.UpdatedAvailabilityFilter({ value: 'Available' }),
      isBeforeFailure: true,
    },
    {
      criteria: 'availability filtering',
      timing: 'after the page failure',
      message: Message.UpdatedAvailabilityFilter({ value: 'Available' }),
      isBeforeFailure: false,
    },
  ])(
    '$criteria changed $timing replaces the failed page with a complete catalog',
    async ({ message: criteriaMessage, isBeforeFailure }) => {
      await Effect.runPromise(
        Story.story(
          ApplicationBlock,
          Story.given(partialModel),
          scroll(1140),
          resolveSearchTime(1, 10, 60, 60),
          failPageAroundCriteriaChange(criteriaMessage, isBeforeFailure),
          Story.Command.expectHas(
            ReadCurrentTime({
              searchGeneration: 1,
              offset: 0,
              limit: domainTlds.length,
              isRefreshRequested: false,
            }),
          ),
          resolveSearchTime(1, 30, 0, domainTlds.length),
          Story.Command.expectHas(makeDomainsFetch(catalogArgs, 3)),
          Story.model(model => {
            expect(searchViewState(model)).toEqual(
              SearchViewState.Ready({
                domains: firstPageDomains,
                domainRequest: DomainRequestPresentation.Loading({
                  offset: 0,
                  limit: domainTlds.length,
                }),
              }),
            )
          }),
          resolveDomainsSuccess(catalogArgs, 3, allDomains, 40),
          Story.model(model => {
            expect(searchViewState(model)).toEqual(
              SearchViewState.Ready({ domains: allDomains }),
            )
          }),
          resolveResultsListScrolls,
          Story.Command.expectNone(),
        ),
      )
    },
  )

  test('a failed complete catalog waits for explicit retry and retries that catalog', async () => {
    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(partialModel),
        Story.message(Message.UpdatedSortOrder({ value: 'PriceAscending' })),
        resolveSearchTime(1, 10, 0, domainTlds.length),
        resolveDomainsFailure(catalogArgs, 2, pageFailure, 20),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({
              domains: firstPageDomains,
              domainRequest: DomainRequestPresentation.Failed({
                offset: 0,
                limit: domainTlds.length,
                error: pageFailure.error,
              }),
            }),
          )
        }),
        scroll(1140),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
        Story.message(Message.ClickedRetrySearch()),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        resolveSearchTime(1, 30, 0, domainTlds.length, true),
        Story.Command.expectHas(makeDomainsFetch(catalogArgs, 3)),
        resolveDomainsSuccess(catalogArgs, 3, allDomains, 40),
        Story.model(model => {
          expect(model.selectedDomainRanges).toEqual([
            { offset: 0, limit: domainTlds.length },
          ])
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({ domains: allDomains }),
          )
        }),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })
})
