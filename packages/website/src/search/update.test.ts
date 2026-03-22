import { Test } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { init } from './init'
import {
  ClearedSearchQuery,
  CompletedNavigateSearch,
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
    Test.story(
      update,
      Test.with(model),
      Test.message(UpdatedSearchQuery({ query: 'routing' })),
      Test.tap(({ model, commands }) => {
        expect(model.query).toBe('routing')
        expect(model.searchState._tag).toBe('Loading')
        expect(commands[0]?.name).toBe(FetchSearchResults.name)
      }),
      Test.resolve(
        FetchSearchResults,
        ReceivedSearchResults({ results: searchResults, query: 'routing' }),
      ),
      Test.tap(({ model }) => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
        expect(model.activeResultIndex).toBe(0)
      }),
    )
  })

  test('clearing the query resets to Idle', () => {
    Test.story(
      update,
      Test.with({ ...model, query: 'routing' }),
      Test.message(UpdatedSearchQuery({ query: '' })),
      Test.tap(({ model, commands }) => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
        expect(commands).toHaveLength(0)
      }),
    )
  })

  test('same query is ignored', () => {
    Test.story(
      update,
      Test.with({ ...model, query: 'routing' }),
      Test.message(UpdatedSearchQuery({ query: 'routing' })),
      Test.tap(({ model, commands }) => {
        expect(model.searchState._tag).toBe('Idle')
        expect(commands).toHaveLength(0)
      }),
    )
  })

  test('new query preserves previous results in Loading state', () => {
    Test.story(
      update,
      Test.with({
        ...model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
      }),
      Test.message(UpdatedSearchQuery({ query: 'testing' })),
      Test.tap(({ model }) => {
        expect(model.query).toBe('testing')
        expect(model.searchState._tag).toBe('Loading')
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: searchResults,
        })
      }),
      Test.resolve(
        FetchSearchResults,
        ReceivedSearchResults({ results: [], query: 'testing' }),
      ),
    )
  })

  test('stale results are ignored', () => {
    Test.story(
      update,
      Test.with({ ...model, query: 'testing' }),
      Test.message(
        ReceivedSearchResults({ results: searchResults, query: 'routing' }),
      ),
      Test.tap(({ model }) => {
        expect(model.searchState._tag).toBe('Idle')
      }),
    )
  })

  test('selecting a result navigates and resets', () => {
    Test.story(
      update,
      Test.with(model),
      Test.message(SelectedSearchResult({ url: '/docs/commands' })),
      Test.tap(({ model, commands }) => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(commands[0]?.name).toBe(NavigateToResult.name)
      }),
      Test.resolve(NavigateToResult, CompletedNavigateSearch()),
      Test.tap(({ model }) => {
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

    Test.story(
      update,
      Test.with(modelWithResults),
      Test.message(PressedArrowKey({ direction: 'Down' })),
      Test.tap(({ model, commands }) => {
        expect(model.activeResultIndex).toBe(1)
        expect(commands[0]?.name).toBe(ScrollToResult.name)
      }),
      Test.resolve(ScrollToResult, CompletedScrollToResult()),
      Test.message(PressedArrowKey({ direction: 'Down' })),
      Test.tap(({ model }) => {
        expect(model.activeResultIndex).toBe(0)
      }),
      Test.resolve(ScrollToResult, CompletedScrollToResult()),
      Test.message(PressedArrowKey({ direction: 'Up' })),
      Test.tap(({ model }) => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Test.resolve(ScrollToResult, CompletedScrollToResult()),
    )
  })

  test('clearing the query explicitly resets state', () => {
    Test.story(
      update,
      Test.with({
        ...model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
        activeResultIndex: 1,
      }),
      Test.message(ClearedSearchQuery()),
      Test.tap(({ model }) => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    )
  })
})
