import { Effect } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  ScrollToResult,
} from './command'
import { DialogBinding } from './composition'
import { SearchState } from './domain'
import { InMessage } from './inMessage'
import { SearchBlock, layer } from './index'
import { Message } from './message'

const searchSubject = { block: SearchBlock, layer }
const initialSearchModel = Story.story(searchSubject, Story.init())

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
  it.effect(
    'received open and route notifications retain focus and close cleanup',
    () =>
      Story.story(
        searchSubject,
        Story.init(),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.model(model => expect(model.dialog.isOpen).toBe(true)),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        Story.message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Story.Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        Story.inMessage(InMessage.InformedOfRouteChange()),
        Story.model(model => {
          expect(model.dialog.isOpen).toBe(false)
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
        }),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
      ),
  )

  it.effect('typing a query starts a search', () =>
    Story.story(
      searchSubject,
      Story.init(),
      Story.message(Message.UpdatedSearchQuery({ query: 'routing' })),
      Story.model(model => {
        expect(model.query).toBe('routing')
        expect(model.searchState._tag).toBe('Loading')
      }),
      Story.Command.expectHas(FetchSearchResults),
      Story.Command.resolve(
        FetchSearchResults,
        Message.CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      Story.model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
        expect(model.activeResultIndex).toBe(0)
      }),
    ),
  )
  it.effect('clearing the query resets to Idle', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      yield* Story.story(
        searchSubject,
        Story.given(modifyFields(initialModel, { query: () => 'routing' })),
        Story.message(Message.UpdatedSearchQuery({ query: '' })),
        Story.model(model => {
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
          expect(model.activeResultIndex).toBe(-1)
        }),
        Story.Command.expectNone(),
      )
    }),
  )
  it.effect('same query is ignored', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      yield* Story.story(
        searchSubject,
        Story.given(modifyFields(initialModel, { query: () => 'routing' })),
        Story.message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Story.model(model => {
          expect(model.searchState._tag).toBe('Idle')
        }),
        Story.Command.expectNone(),
      )
    }),
  )
  it.effect('new query preserves previous results in Loading state', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      yield* Story.story(
        searchSubject,
        Story.given(
          modifyFields(initialModel, {
            query: () => 'routing',
            searchState: () => SearchState.Ok({ results: searchResults }),
          }),
        ),
        Story.message(Message.UpdatedSearchQuery({ query: 'testing' })),
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
          Message.CompletedFetchSearchResults({
            results: [],
            query: 'testing',
          }),
        ),
      )
    }),
  )
  it.effect('stale results are ignored', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      yield* Story.story(
        searchSubject,
        Story.given(modifyFields(initialModel, { query: () => 'testing' })),
        Story.message(
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        Story.model(model => {
          expect(model.searchState._tag).toBe('Idle')
        }),
      )
    }),
  )
  it.effect('selecting a result navigates and resets', () =>
    Story.story(
      searchSubject,
      Story.init(),
      Story.message(Message.SelectedSearchResult({ url: '/docs/commands' })),
      Story.model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
      }),
      Story.Command.expectHas(NavigateToResult),
      Story.Command.resolve(
        NavigateToResult,
        Message.CompletedNavigateToResult(),
      ),
      Story.model(model => {
        expect(model.query).toBe('')
      }),
    ),
  )
  it.effect('arrow keys cycle through results', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      const modelWithResults = modifyFields(initialModel, {
        searchState: () => SearchState.Ok({ results: searchResults }),
        activeResultIndex: () => 0,
      })
      yield* Story.story(
        searchSubject,
        Story.given(modelWithResults),
        Story.message(Message.PressedArrowKey({ direction: 'Down' })),
        Story.model(model => {
          expect(model.activeResultIndex).toBe(1)
        }),
        Story.Command.expectHas(ScrollToResult),
        Story.Command.resolve(
          ScrollToResult,
          Message.CompletedScrollToResult(),
        ),
        Story.message(Message.PressedArrowKey({ direction: 'Down' })),
        Story.model(model => {
          expect(model.activeResultIndex).toBe(0)
        }),
        Story.Command.resolve(
          ScrollToResult,
          Message.CompletedScrollToResult(),
        ),
        Story.message(Message.PressedArrowKey({ direction: 'Up' })),
        Story.model(model => {
          expect(model.activeResultIndex).toBe(1)
        }),
        Story.Command.resolve(
          ScrollToResult,
          Message.CompletedScrollToResult(),
        ),
      )
    }),
  )
  it.effect('clearing the query explicitly resets state', () =>
    Effect.gen(function* () {
      const initialModel = yield* initialSearchModel

      yield* Story.story(
        searchSubject,
        Story.given(
          modifyFields(initialModel, {
            query: () => 'routing',
            searchState: () => SearchState.Ok({ results: searchResults }),
            activeResultIndex: () => 1,
          }),
        ),
        Story.message(Message.ClearedSearchQuery()),
        Story.model(model => {
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
          expect(model.activeResultIndex).toBe(-1)
        }),
      )
    }),
  )
  it.effect(
    'close completion clears Search after cleanup, including after a reopen',
    () =>
      Story.story(
        searchSubject,
        Story.init(),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        Story.message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Story.Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        Story.messageIn(
          DialogBinding,
          Dialog.DialogBlock.Message.CanceledDialog(),
        ),
        Story.model(model => expect(model.query).toBe('routing')),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.model(model => {
          expect(model.query).toBe('routing')
          expect(model.dialog.isOpen).toBe(true)
        }),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Story.model(model => {
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
          expect(model.activeResultIndex).toBe(-1)
        }),
        Story.Command.expectNone(),
      ),
  )

  it.effect(
    'route changes clear and close Search while keyboard clearing leaves it open',
    () =>
      Story.story(
        searchSubject,
        Story.init(),
        Story.inMessage(InMessage.RequestedOpen()),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        Story.message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Story.message(Message.ClearedSearchQuery()),
        Story.model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(true)
        }),
        Story.Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        Story.message(Message.UpdatedSearchQuery({ query: 'composition' })),
        Story.Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'composition',
          }),
        ),
        Story.inMessage(InMessage.InformedOfRouteChange()),
        Story.model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(false)
        }),
        Story.Command.expectExact(Dialog.test.CloseDialog),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
      ),
  )
})
