import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { init } from './init'
import {
  ClearedSearchQuery,
  CompletedNavigateToResult,
  CompletedScrollToResult,
  PressedArrowKey,
  ReceivedSearchResults,
  SelectedSearchResult,
  UpdatedSearchQuery,
} from './message'
import { Ok } from './model'
import { update } from './update'

const model = init()[0]

const searchResults = [
  {
    url: '/docs/commands',
    title: 'Commands',
    excerpt: 'Side effects...',
    section: 'Core',
  },
  {
    url: '/docs/testing',
    title: 'Testing',
    excerpt: 'Pure tests...',
    section: 'Core',
  },
]

describe('search', () => {
  test('typing a query starts a search', () => {
    Story.story(
      update,
      Story.with(model),
      Story.message(UpdatedSearchQuery({ query: 'routing' })),
      Story.model(model => {
        expect(model.query).toBe('routing')
        expect(model.searchState._tag).toBe('Loading')
      }),
      Story.Command.expectHas(FetchSearchResults),
      Story.Command.resolve(
        FetchSearchResults,
        ReceivedSearchResults({ results: searchResults, query: 'routing' }),
      ),
      Story.model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
        expect(model.activeResultIndex).toBe(0)
      }),
    )
  })

  test('clearing the query resets to Idle', () => {
    Story.story(
      update,
      Story.with({ ...model, query: 'routing' }),
      Story.message(UpdatedSearchQuery({ query: '' })),
      Story.model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
      Story.Command.expectNone(),
    )
  })

  test('same query is ignored', () => {
    Story.story(
      update,
      Story.with({ ...model, query: 'routing' }),
      Story.message(UpdatedSearchQuery({ query: 'routing' })),
      Story.model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
      Story.Command.expectNone(),
    )
  })

  test('new query preserves previous results in Loading state', () => {
    Story.story(
      update,
      Story.with({
        ...model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
      }),
      Story.message(UpdatedSearchQuery({ query: 'testing' })),
      Story.model(model => {
        expect(model.query).toBe('testing')
        expect(model.searchState._tag).toBe('Loading')
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: searchResults,
        })
      }),
      Story.Command.resolve(
        FetchSearchResults,
        ReceivedSearchResults({ results: [], query: 'testing' }),
      ),
    )
  })

  test('stale results are ignored', () => {
    Story.story(
      update,
      Story.with({ ...model, query: 'testing' }),
      Story.message(
        ReceivedSearchResults({ results: searchResults, query: 'routing' }),
      ),
      Story.model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
    )
  })

  test('selecting a result navigates and resets', () => {
    Story.story(
      update,
      Story.with(model),
      Story.message(SelectedSearchResult({ url: '/docs/commands' })),
      Story.model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
      }),
      Story.Command.expectHas(NavigateToResult),
      Story.Command.resolve(NavigateToResult, CompletedNavigateToResult()),
      Story.model(model => {
        expect(model.query).toBe('')
      }),
    )
  })

  test('arrow keys cycle through results', () => {
    const modelWithResults = {
      ...model,
      searchState: Ok({ results: searchResults }),
      activeResultIndex: 0,
    }

    Story.story(
      update,
      Story.with(modelWithResults),
      Story.message(PressedArrowKey({ direction: 'Down' })),
      Story.model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Story.Command.expectHas(ScrollToResult),
      Story.Command.resolve(ScrollToResult, CompletedScrollToResult()),
      Story.message(PressedArrowKey({ direction: 'Down' })),
      Story.model(model => {
        expect(model.activeResultIndex).toBe(0)
      }),
      Story.Command.resolve(ScrollToResult, CompletedScrollToResult()),
      Story.message(PressedArrowKey({ direction: 'Up' })),
      Story.model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Story.Command.resolve(ScrollToResult, CompletedScrollToResult()),
    )
  })

  test('clearing the query explicitly resets state', () => {
    Story.story(
      update,
      Story.with({
        ...model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
        activeResultIndex: 1,
      }),
      Story.message(ClearedSearchQuery()),
      Story.model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    )
  })
})
