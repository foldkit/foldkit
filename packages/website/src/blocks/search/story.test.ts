import {
  Command,
  type TestBlock,
  given,
  inMessage,
  init,
  message,
  messageFrom,
  model,
  story,
  withBlock,
} from 'foldkit/story'
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

const makeFixture = (block: TestBlock<typeof searchSubject>) => ({
  update: block.update,
  init_: block.init(),
})

describe('search', () => {
  it.effect(
    'received open and route notifications retain focus and close cleanup',
    () =>
      story(
        searchSubject,
        init(),
        inMessage(InMessage.RequestedOpen()),
        model(model => expect(model.dialog.isOpen).toBe(true)),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
        message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => {
          expect(model.dialog.isOpen).toBe(false)
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
        }),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
      ),
  )

  it.effect('typing a query starts a search', () =>
    story(
      searchSubject,
      init(),
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
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

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
    }),
  )
  it.effect('same query is ignored', () =>
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

      story(
        update,
        given(modifyFields(init_.model, { query: () => 'routing' })),
        message(Message.UpdatedSearchQuery({ query: 'routing' })),
        model(model => {
          expect(model.searchState._tag).toBe('Idle')
        }),
        Command.expectNone(),
      )
    }),
  )
  it.effect('new query preserves previous results in Loading state', () =>
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

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
          Message.CompletedFetchSearchResults({
            results: [],
            query: 'testing',
          }),
        ),
      )
    }),
  )
  it.effect('stale results are ignored', () =>
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

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
    }),
  )
  it.effect('selecting a result navigates and resets', () =>
    story(
      searchSubject,
      init(),
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
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

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
    }),
  )
  it.effect('clearing the query explicitly resets state', () =>
    withBlock(searchSubject, executable => {
      const { update, init_ } = makeFixture(executable)

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
    }),
  )
  it.effect(
    'close completion clears Search after cleanup, including after a reopen',
    () =>
      story(
        searchSubject,
        init(),
        inMessage(InMessage.RequestedOpen()),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
        message(Message.UpdatedSearchQuery({ query: 'routing' })),
        Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        messageFrom(DialogBinding, Dialog.DialogBlock.Message.CanceledDialog()),
        model(model => expect(model.query).toBe('routing')),
        inMessage(InMessage.RequestedOpen()),
        model(model => {
          expect(model.query).toBe('routing')
          expect(model.dialog.isOpen).toBe(true)
        }),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.query).toBe('')
          expect(model.searchState._tag).toBe('Idle')
          expect(model.activeResultIndex).toBe(-1)
        }),
        Command.expectNone(),
      ),
  )

  it.effect(
    'route changes clear and close Search while keyboard clearing leaves it open',
    () =>
      story(
        searchSubject,
        init(),
        inMessage(InMessage.RequestedOpen()),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Command.resolve(FocusSearchInput, Message.CompletedFocusSearchInput()),
        message(Message.UpdatedSearchQuery({ query: 'routing' })),
        message(Message.ClearedSearchQuery()),
        model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(true)
        }),
        Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'routing',
          }),
        ),
        message(Message.UpdatedSearchQuery({ query: 'composition' })),
        Command.resolve(
          FetchSearchResults,
          Message.CompletedFetchSearchResults({
            results: searchResults,
            query: 'composition',
          }),
        ),
        inMessage(InMessage.InformedOfRouteChange()),
        model(model => {
          expect(model.query).toBe('')
          expect(model.dialog.isOpen).toBe(false)
        }),
        Command.expectExact(Dialog.test.CloseDialog),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
      ),
  )
})
