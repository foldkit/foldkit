import { Array, Effect, Option, Result } from 'effect'
import { Story } from 'foldkit/experimental/layered/testing'
import { UrlRequest } from 'foldkit/navigation'
import { describe, expect, test } from 'vitest'

import { VirtualList } from '@foldkit/ui'

import { Domain } from '../../shared/domain'
import { makeDomainFixtures } from '../../shared/domain.fixture'
import { ApplicationBlock } from '../block'
import {
  FocusSearchInput,
  LoadExternal,
  NavigateInternal,
  ReplaceSearchUrl,
  ScrollPageToTop,
} from '../command'
import { DomainsQueryBinding, ResultsListBinding } from '../composition'
import { DomainsQuery, DomainsQueryFailure } from '../domainsQuery'
import { Message } from '../message'
import { emptyModel, readyModel, urlOrThrow } from '../model.fixture'
import { ResultsListBlock } from '../resultsList'
import { ApplicationRoute, routeToQuery, searchHref } from '../route'
import { SearchViewState, searchViewState } from '../searchViewState'
import {
  domainsRequestKey,
  makeDomainsFetch,
  resolveDomainsCancellation,
  resolveDomainsSuccess,
  resolveRemainingFirstPageDomains,
  resolveResultsListScrolls,
  resolveSearchTime,
} from './test'

test('typing synchronizes the URL before the route starts its domain request', async () => {
  const args = {
    label: 'fresh',
    offset: 0,
    limit: 4,
  }

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(emptyModel),
      Story.message(Message.UpdatedSearch({ value: 'fresh' })),
      Story.model(model => {
        expect(model.route).toEqual(emptyModel.route)
        expect(model.searchGeneration).toBe(1)
        expect(model.searchLayout).toBe('Search')
        expect(searchViewState(model)).toEqual(SearchViewState.Idle())
      }),
      Story.Command.expectExact(ReplaceSearchUrl({ q: Option.some('fresh') })),
      Story.Command.resolve(
        ReplaceSearchUrl({ q: Option.some('fresh') }),
        Message.CompletedReplaceSearchUrl(),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=fresh') }),
      ),
      Story.model(model => {
        expect(model.route).toEqual(
          ApplicationRoute.Search({ q: Option.some('fresh') }),
        )
        expect(model.searchGeneration).toBe(2)
        expect(searchViewState(model)).toEqual(SearchViewState.Loading())
      }),
      resolveSearchTime(2, 100),
      Story.Command.expectHas(makeDomainsFetch(args, 1)),
      resolveDomainsSuccess(
        args,
        1,
        Array.take(makeDomainFixtures('fresh'), 4),
        120,
      ),
      Story.model(model => {
        expect(searchViewState(model)._tag).toBe('Ready')
      }),
      resolveRemainingFirstPageDomains(
        'fresh',
        2,
        2,
        Array.take(Array.drop(makeDomainFixtures('fresh'), 4), 56),
        120,
      ),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

describe('domain validation', () => {
  test.each([
    { query: '  HTTPS://MiXeD-Name.dev/path  ', label: 'mixed-name' },
    { query: 'a', label: 'a' },
    { query: 'a'.repeat(63), label: 'a'.repeat(63) },
  ])('searches the normalized label for $query', async ({ query, label }) => {
    const args = {
      label,
      offset: 0,
      limit: 4,
    }

    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(emptyModel),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow(`http://localhost${searchHref(query)}`),
          }),
        ),
        resolveSearchTime(1, 0),
        Story.Command.expectHas(makeDomainsFetch(args, 1)),
        resolveDomainsSuccess(
          args,
          1,
          Array.take(makeDomainFixtures(label), 4),
        ),
        Story.model(model => {
          expect(routeToQuery(model.route)).toBe(query)
          expect(searchViewState(model)._tag).toBe('Ready')
        }),
        resolveRemainingFirstPageDomains(
          label,
          1,
          2,
          Array.take(Array.drop(makeDomainFixtures(label), 4), 56),
        ),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })

  test.each([
    'not a domain!',
    '-acme',
    'acme-',
    'under_score',
    'a'.repeat(64),
    '   ',
  ])('rejects %j without scheduling domain lookups', async query => {
    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(emptyModel),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow(`http://localhost${searchHref(query)}`),
          }),
        ),
        Story.model(model => {
          expect(searchViewState(model)).toEqual(
            SearchViewState.Failed({
              error:
                'Enter a domain name using letters, numbers, and hyphens (up to 63 characters).',
            }),
          )
        }),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  })
})

test('an unchanged input keeps its active Query request', async () => {
  const args = {
    label: 'acme',
    offset: 0,
    limit: 4,
  }

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(emptyModel),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=acme') }),
      ),
      resolveSearchTime(1, 0),
      Story.Command.expectHas(makeDomainsFetch(args, 1)),
      Story.message(Message.UpdatedSearch({ value: 'acme' })),
      Story.Command.resolve(
        ReplaceSearchUrl({ q: Option.some('acme') }),
        Message.CompletedReplaceSearchUrl(),
      ),
      Story.model(model => {
        expect(model.searchGeneration).toBe(1)
        expect(DomainsQuery.pendingArgs(model.domainsQuery)).toEqual([args])
      }),
      resolveDomainsSuccess(
        args,
        1,
        Array.take(makeDomainFixtures('acme'), 4),
        10,
      ),
      resolveRemainingFirstPageDomains(
        'acme',
        1,
        2,
        Array.take(Array.drop(makeDomainFixtures('acme'), 4), 56),
        10,
      ),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test.each([
  {
    name: 'success',
    result: Result.succeed(Array.take(makeDomainFixtures('acme'), 4)),
  },
  {
    name: 'failure',
    result: Result.fail(
      DomainsQueryFailure.make({ error: 'Sample data unavailable' }),
    ),
  },
])(
  'a canceled $name before URL delivery cannot restore old results or schedule loading',
  async ({ result }) => {
    const previousArgs = { label: 'acme', offset: 0, limit: 4 }
    const currentArgs = { label: 'other', offset: 0, limit: 4 }
    const currentDomains = Array.take(makeDomainFixtures('other'), 4)

    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(emptyModel),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=acme') }),
        ),
        resolveSearchTime(1, 0),
        Story.Command.expectHas(makeDomainsFetch(previousArgs, 1)),
        Story.message(Message.UpdatedSearch({ value: 'other' })),
        resolveDomainsCancellation(previousArgs, 1),
        resolveResultsListScrolls,
        Story.Command.expectExact(
          ReplaceSearchUrl({ q: Option.some('other') }),
        ),
        Story.messageIn(
          DomainsQueryBinding,
          DomainsQuery.Message.CompletedFetch({
            args: previousArgs,
            generation: 1,
            requestKey: domainsRequestKey(previousArgs),
            result,
            completedAtMillis: 100,
          }),
        ),
        Story.model(model => {
          expect(routeToQuery(model.route)).toBe('acme')
          expect(searchViewState(model)).toEqual(SearchViewState.Loading())
        }),
        Story.Command.expectExact(
          ReplaceSearchUrl({ q: Option.some('other') }),
        ),
        Story.Command.resolve(
          ReplaceSearchUrl({ q: Option.some('other') }),
          Message.CompletedReplaceSearchUrl(),
        ),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=other') }),
        ),
        resolveSearchTime(3, 200),
        Story.Command.expectHas(makeDomainsFetch(currentArgs, 3)),
        resolveDomainsSuccess(currentArgs, 3, currentDomains, 220),
        Story.model(model => {
          expect(routeToQuery(model.route)).toBe('other')
          expect(searchViewState(model)).toEqual(
            SearchViewState.Ready({ domains: currentDomains }),
          )
        }),
        resolveRemainingFirstPageDomains(
          'other',
          3,
          4,
          Array.take(Array.drop(makeDomainFixtures('other'), 4), 56),
          220,
        ),
        resolveResultsListScrolls,
        Story.Command.expectNone(),
      ),
    )
  },
)

test('a planning Clock from the previous route cannot start domain lookups', async () => {
  const otherArgs = {
    label: 'other',
    offset: 0,
    limit: 4,
  }

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(emptyModel),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=acme') }),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=other') }),
      ),
      resolveSearchTime(1, 10),
      Story.model(model => {
        expect(DomainsQuery.pendingArgs(model.domainsQuery)).toEqual([])
        expect(routeToQuery(model.route)).toBe('other')
      }),
      resolveSearchTime(2, 20),
      Story.Command.expectHas(makeDomainsFetch(otherArgs, 1)),
      resolveDomainsSuccess(
        otherArgs,
        1,
        Array.take(makeDomainFixtures('other'), 4),
        30,
      ),
      resolveRemainingFirstPageDomains(
        'other',
        2,
        2,
        Array.take(Array.drop(makeDomainFixtures('other'), 4), 56),
        30,
      ),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test('leaving search cancels its pending Query key', async () => {
  const args = {
    label: 'acme',
    offset: 0,
    limit: 4,
  }

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(emptyModel),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/?q=acme') }),
      ),
      resolveSearchTime(1, 0),
      Story.Command.expectHas(makeDomainsFetch(args, 1)),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/missing') }),
      ),
      Story.model(model => {
        expect(model.route).toEqual(
          ApplicationRoute.NotFound({ path: '/missing' }),
        )
        expect(searchViewState(model)).toEqual(SearchViewState.Idle())
        expect(DomainsQuery.pendingArgs(model.domainsQuery)).toEqual([])
      }),
      resolveDomainsCancellation(args, 1),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test('clearing the input returns to the idle route, restores focus, and scrolls to the top', async () => {
  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(readyModel('acme')),
      Story.message(Message.ClickedClearSearch()),
      Story.Command.resolve(
        ReplaceSearchUrl({ q: Option.none() }),
        Message.CompletedReplaceSearchUrl(),
      ),
      Story.Command.resolve(
        FocusSearchInput,
        Message.CompletedFocusSearchInput(),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
      ),
      Story.Command.resolve(
        ScrollPageToTop,
        Message.CompletedScrollPageToTop(),
      ),
      Story.model(model => {
        expect(model.route).toEqual(
          ApplicationRoute.Search({ q: Option.none() }),
        )
        expect(searchViewState(model)).toEqual(SearchViewState.Idle())
        expect(model.searchLayout).toBe('Search')
      }),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test('backspacing to an empty query scrolls to the top after the route changes', async () => {
  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(readyModel('a')),
      Story.message(Message.UpdatedSearch({ value: '' })),
      Story.Command.expectExact(ReplaceSearchUrl({ q: Option.none() })),
      Story.Command.resolve(
        ReplaceSearchUrl({ q: Option.none() }),
        Message.CompletedReplaceSearchUrl(),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
      ),
      Story.model(model => {
        expect(searchViewState(model)).toEqual(SearchViewState.Idle())
        expect(model.searchLayout).toBe('Search')
      }),
      Story.Command.resolve(
        ScrollPageToTop,
        Message.CompletedScrollPageToTop(),
      ),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test('unrelated URL changes do not restart a settled search', async () => {
  const initialModel = readyModel('acme')

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(initialModel),
      Story.message(
        Message.ChangedUrl({
          url: urlOrThrow(
            'http://localhost/?q=acme&utm_source=example#results',
          ),
        }),
      ),
      Story.model(model => {
        expect(model.searchGeneration).toBe(initialModel.searchGeneration)
        expect(model.domainsQuery).toBe(initialModel.domainsQuery)
        expect(searchViewState(model)).toEqual(searchViewState(initialModel))
      }),
      Story.Command.expectNone(),
    ),
  )
})

test('internal and external links use their respective navigation Commands', async () => {
  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(emptyModel),
      Story.message(
        Message.ClickedLink({
          request: UrlRequest.Internal({
            url: urlOrThrow('http://localhost/?q=acme'),
          }),
        }),
      ),
      Story.Command.resolve(
        NavigateInternal({ url: 'http://localhost/?q=acme' }),
        Message.CompletedNavigateInternal(),
      ),
      Story.message(
        Message.ClickedLink({
          request: UrlRequest.External({ href: 'https://vercel.com/login' }),
        }),
      ),
      Story.Command.resolve(
        LoadExternal({ href: 'https://vercel.com/login' }),
        Message.CompletedLoadExternal(),
      ),
      Story.Command.expectNone(),
    ),
  )
})

test('cart additions are unique and removals are idempotent', async () => {
  const domain = Domain.Available({
    name: 'acme.com',
    tld: 'com',
    price: 12,
    renewalPrice: 12,
    years: 1,
    isPremium: false,
  })

  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(readyModel('acme')),
      Story.message(Message.ClickedAddDomain({ domain })),
      Story.message(Message.ClickedAddDomain({ domain })),
      Story.message(Message.ClickedRemoveDomain({ name: 'missing.com' })),
      Story.model(model => {
        expect(model.cart).toEqual([domain])
      }),
      Story.message(Message.ClickedRemoveDomain({ name: domain.name })),
      Story.message(Message.ClickedRemoveDomain({ name: domain.name })),
      Story.model(model => {
        expect(model.cart).toEqual([])
      }),
      Story.Command.expectNone(),
    ),
  )
})

test('clearing a scrolled search discards its virtual viewport before another search', async () => {
  await Effect.runPromise(
    Story.story(
      ApplicationBlock,
      Story.given(readyModel('acme')),
      Story.messageIn(
        ResultsListBinding,
        ResultsListBlock.Message.ObservedContainerScroll({
          scrollTop: 1300,
          scrollHeight: 12000,
          containerHeight: 400,
          anchor: VirtualList.ObservedAnchor.Row({
            key: 'acme.studio',
            index: 2,
            viewportOffset: -20,
          }),
        }),
      ),
      Story.model(model => {
        expect(model.resultsList.scrollTop).toBe(1300)
        expect(model.resultsList.viewportAnchor._tag).toBe('Row')
      }),
      Story.message(Message.UpdatedSearch({ value: '' })),
      Story.Command.resolve(
        ReplaceSearchUrl({ q: Option.none() }),
        Message.CompletedReplaceSearchUrl(),
      ),
      Story.message(
        Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
      ),
      Story.Command.resolve(
        ScrollPageToTop,
        Message.CompletedScrollPageToTop(),
      ),
      Story.model(model => {
        expect(model.resultsList.scrollTop).toBe(0)
        expect(model.resultsList.viewportAnchor).toEqual({
          _tag: 'Offset',
          scrollTop: 0,
        })
        expect(model.resultsList.measurement._tag).toBe('Unmeasured')
      }),
      resolveResultsListScrolls,
      Story.Command.expectNone(),
    ),
  )
})

test.each([true, false])(
  'the early search handoff preserves an opened search: %s',
  async isSearchStarted => {
    await Effect.runPromise(
      Story.story(
        ApplicationBlock,
        Story.given(emptyModel),
        Story.message(
          Message.CompletedReleaseEarlySearchListeners({ isSearchStarted }),
        ),
        Story.model(model => {
          expect(model.searchLayout).toBe(
            isSearchStarted ? 'Search' : 'Landing',
          )
          expect(searchViewState(model)).toEqual(SearchViewState.Idle())
        }),
        Story.Command.expectNone(),
      ),
    )
  },
)
