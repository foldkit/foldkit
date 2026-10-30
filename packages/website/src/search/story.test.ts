import { Layer } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { Dialog, DialogLive } from '@foldkit/ui'
import { test as DialogTest } from '@foldkit/ui/dialog'

import { PagefindService } from '../pagefind'
import { SearchLive } from './block'
import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  ScrollToResult,
} from './command'
import { Message } from './message'

const SearchTest = SearchLive.pipe(
  Layer.provide(DialogLive),
  Layer.provide(
    Layer.succeed(PagefindService, {
      search: () => Promise.resolve({ results: [] }),
    }),
  ),
)

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

const deliverToDialog = (dialogMessage: typeof Dialog.Dialog.Message.Type) =>
  message(Block.deliver(Dialog.Dialog, 'dialog', dialogMessage))

const searchFor = (query: string, results: typeof searchResults) => [
  message(Message.UpdatedSearchQuery({ query })),
  Command.resolve(
    FetchSearchResults,
    Message.CompletedFetchSearchResults({ results, query }),
  ),
]

const openSearch = [
  message(Message.RequestedOpen()),
  Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
  Command.resolve(
    DialogTest.ShowDialog,
    Dialog.Dialog.Message.SucceededShowDialog(),
  ),
]

describe('search', () => {
  it.effect('typing a query starts a search', () =>
    story(
      SearchTest,
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
    ),
  )

  it.effect('clearing the query resets to Idle', () =>
    story(
      SearchTest,
      ...searchFor('routing', searchResults),
      message(Message.UpdatedSearchQuery({ query: '' })),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
      Command.expectNone(),
    ),
  )

  it.effect('same query is ignored', () =>
    story(
      SearchTest,
      ...searchFor('routing', searchResults),
      message(Message.UpdatedSearchQuery({ query: 'routing' })),
      model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Ok',
          results: searchResults,
        })
      }),
      Command.expectNone(),
    ),
  )

  it.effect('new query preserves previous results in Loading state', () =>
    story(
      SearchTest,
      ...searchFor('routing', searchResults),
      message(Message.UpdatedSearchQuery({ query: 'testing' })),
      model(model => {
        expect(model.query).toBe('testing')
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: searchResults,
        })
      }),
      Command.resolve(
        FetchSearchResults,
        Message.CompletedFetchSearchResults({ results: [], query: 'testing' }),
      ),
    ),
  )

  it.effect('stale results are ignored', () =>
    story(
      SearchTest,
      message(Message.UpdatedSearchQuery({ query: 'testing' })),
      message(
        Message.CompletedFetchSearchResults({
          results: searchResults,
          query: 'routing',
        }),
      ),
      model(model => {
        expect(model.searchState).toMatchObject({
          _tag: 'Loading',
          results: [],
        })
      }),
      Command.resolve(
        FetchSearchResults,
        Message.CompletedFetchSearchResults({ results: [], query: 'testing' }),
      ),
    ),
  )

  it.effect('selecting a result navigates and resets', () =>
    story(
      SearchTest,
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
    ),
  )

  it.effect('arrow keys cycle through results', () =>
    story(
      SearchTest,
      ...searchFor('routing', searchResults),
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
    ),
  )

  it.effect('clearing the query explicitly resets state', () =>
    story(
      SearchTest,
      ...searchFor('routing', searchResults),
      message(Message.PressedArrowKey({ direction: 'Down' })),
      Command.resolve(ScrollToResult, Message.CompletedScrollToResult()),
      message(Message.ClearedSearchQuery()),
      model(model => {
        expect(model.query).toBe('')
        expect(model.searchState._tag).toBe('Idle')
        expect(model.activeResultIndex).toBe(-1)
      }),
    ),
  )

  it.effect(
    'close completion clears Search after cleanup, including after a reopen',
    () =>
      story(
        SearchTest,
        ...openSearch,
        ...searchFor('routing', searchResults),
        deliverToDialog(Dialog.Dialog.Message.RequestedClose()),
        model(model => {
          expect(model.query).toBe('routing')
        }),
        deliverToDialog(Dialog.Dialog.Message.RequestedOpen()),
        model(model => {
          expect(model.query).toBe('routing')
          expect(model.dialog.isOpen).toBe(true)
        }),
        Command.resolve(
          DialogTest.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
          expect(model.activeResultIndex).toBe(-1)
        }),
        Command.resolve(
          DialogTest.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
      ),
  )

  it.effect(
    'route changes clear and close Search while keyboard clearing leaves it open',
    () =>
      story(
        SearchTest,
        ...openSearch,
        ...searchFor('routing', searchResults),
        message(Message.ClearedSearchQuery()),
        model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(true)
        }),
        ...searchFor('composition', searchResults),
        message(Message.InformedOfRouteChange()),
        model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(false)
        }),
        Command.expectExact(DialogTest.CloseDialog),
        Command.resolve(
          DialogTest.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
      ),
  )
})
