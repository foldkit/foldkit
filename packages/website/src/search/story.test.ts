import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { DialogBlock } from '@foldkit/ui'

import { SearchBlock } from './block'
import { DialogBinding } from './composition'
import { SearchState } from './domain'
import { init } from './init'
import { Message } from './message'
import {
  FetchSearchResults,
  NavigateToResult,
  ScrollToResult,
  update,
} from './update'
const init_ = init()
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
      given(init_.model),
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
      given(modifyFields(init_.model, { query: () => 'routing' })),
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
      given(modifyFields(init_.model, { query: () => 'routing' })),
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
      given(
        modifyFields(init_.model, {
          query: () => 'routing',
          searchState: () => SearchState.Ok({ results: searchResults }),
        }),
      ),
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
      given(modifyFields(init_.model, { query: () => 'testing' })),
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
      given(init_.model),
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
    const modelWithResults = modifyFields(init_.model, {
      searchState: () => SearchState.Ok({ results: searchResults }),
      activeResultIndex: () => 0,
    })
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
      given(
        modifyFields(init_.model, {
          query: () => 'routing',
          searchState: () => SearchState.Ok({ results: searchResults }),
          activeResultIndex: () => 1,
        }),
      ),
      message(Message.ClearedSearchQuery()),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    )
  })
  test('close completion clears Search after cleanup, including after a reopen', () => {
    const opened = update(
      init_.model,
      toParentMessage(DialogBinding, DialogBlock.Message.RequestedOpen()),
    )
    const queried = update(
      opened.model,
      Message.UpdatedSearchQuery({ query: 'routing' }),
    )
    const transitioned = update(
      queried.model,
      toParentMessage(DialogBinding, DialogBlock.Message.RequestedClose()),
    )
    const reopened = update(
      transitioned.model,
      toParentMessage(DialogBinding, DialogBlock.Message.RequestedOpen()),
    )
    const completed = update(
      reopened.model,
      toParentMessage(
        DialogBinding,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
    )
    expect(transitioned.model.query).toBe('routing')
    expect(reopened.model.query).toBe('routing')
    expect(reopened.model.dialog.isOpen).toBe(true)
    expect(completed.model.query).toBe('')
    expect(completed.model.searchState._tag).toBe('Idle')
    expect(completed.model.activeResultIndex).toBe(-1)
  })
  test('route changes clear and close Search while keyboard clearing leaves it open', () => {
    const opened = update(
      init_.model,
      toParentMessage(DialogBinding, DialogBlock.Message.RequestedOpen()),
    )
    const queried = update(
      opened.model,
      Message.UpdatedSearchQuery({ query: 'routing' }),
    )
    const cleared = update(queried.model, Message.ClearedSearchQuery())
    const retyped = update(
      cleared.model,
      Message.UpdatedSearchQuery({ query: 'composition' }),
    )
    const changedRoute = SearchBlock.operations.informRouteChanged(
      retyped.model,
    )
    expect(cleared.model.query).toBe('')
    expect(cleared.model.dialog.isOpen).toBe(true)
    expect(changedRoute.model.query).toBe('')
    expect(changedRoute.model.dialog.isOpen).toBe(false)
    expect(changedRoute.commands?.map(command => command.name)).toEqual([
      'dialog/CloseDialog',
    ])
  })
})
