import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { init } from './init'
import { Message } from './message'
import { Ok } from './model'
import { update } from './update'

const initResult = init()

const searchResults = [
  {
    url: '/docs/commands',
    title: 'Commands',
    excerpt: 'Side effects...',
    section: 'Core',
    kind: '',
  },
  {
    url: '/docs/testing',
    title: 'Testing',
    excerpt: 'Pure tests...',
    section: 'Core',
    kind: '',
  },
]

describe('search', () => {
  test('typing a query starts a search', () => {
    story(
      update,
      given(initResult.model),
      message(Message.UpdatedSearchQuery({ query: 'routing' })),
      model(model => {
        expect(model.query).toBe('routing')
        expect(model.searchState._tag).toBe('Loading')
      }),
      Command.expectHas(FetchSearchResults),
      Command.resolve(
        FetchSearchResults,
        Message.CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
        expect(model.activeResultIndex).toBe(0)
      }),
    )
  })

  test('clearing the query resets to Idle', () => {
    story(
      update,
      given({ ...initResult.model, query: 'routing' }),
      message(Message.UpdatedSearchQuery({ query: '' })),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
      Command.expectNone(),
    )
  })

  test('same query is ignored', () => {
    story(
      update,
      given({ ...initResult.model, query: 'routing' }),
      message(Message.UpdatedSearchQuery({ query: 'routing' })),
      model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
      Command.expectNone(),
    )
  })

  test('new query preserves previous results in Loading state', () => {
    story(
      update,
      given({
        ...initResult.model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
      }),
      message(Message.UpdatedSearchQuery({ query: 'testing' })),
      model(model => {
        expect(model.query).toBe('testing')
        expect(model.searchState._tag).toBe('Loading')
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: searchResults,
        })
      }),
      Command.resolve(
        FetchSearchResults,
        Message.CompletedFetchSearchResults({ results: [], query: 'testing' }),
      ),
    )
  })

  test('stale results are ignored', () => {
    story(
      update,
      given({ ...initResult.model, query: 'testing' }),
      message(
        Message.CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      model(model => {
        expect(model.searchState._tag).toBe('Idle')
      }),
    )
  })

  test('selecting a result navigates and resets', () => {
    story(
      update,
      given(initResult.model),
      message(Message.SelectedSearchResult({ url: '/docs/commands' })),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
      }),
      Command.expectHas(NavigateToResult),
      Command.resolve(NavigateToResult, Message.CompletedNavigateToResult()),
      model(model => {
        expect(model.query).toBe('')
      }),
    )
  })

  test('arrow keys cycle through results', () => {
    const modelWithResults = {
      ...initResult.model,
      searchState: Ok({ results: searchResults }),
      activeResultIndex: 0,
    }

    story(
      update,
      given(modelWithResults),
      message(Message.PressedArrowKey({ direction: 'Down' })),
      model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Command.expectHas(ScrollToResult),
      Command.resolve(ScrollToResult, Message.CompletedScrollToResult()),
      message(Message.PressedArrowKey({ direction: 'Down' })),
      model(model => {
        expect(model.activeResultIndex).toBe(0)
      }),
      Command.resolve(ScrollToResult, Message.CompletedScrollToResult()),
      message(Message.PressedArrowKey({ direction: 'Up' })),
      model(model => {
        expect(model.activeResultIndex).toBe(1)
      }),
      Command.resolve(ScrollToResult, Message.CompletedScrollToResult()),
    )
  })

  test('clearing the query explicitly resets state', () => {
    story(
      update,
      given({
        ...initResult.model,
        query: 'routing',
        searchState: Ok({ results: searchResults }),
        activeResultIndex: 1,
      }),
      message(Message.ClearedSearchQuery()),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    )
  })
})
