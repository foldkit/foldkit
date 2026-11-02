import { Effect } from 'effect'
import { type TestBlock, withBlock } from 'foldkit/story'
import {
  Command,
  given,
  inMessage,
  init,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import { SearchBlock, layer } from './block'
import { FocusSearchInput } from './command'
import { DialogBinding } from './composition'
import { SearchState } from './domain'
import { InMessage } from './inMessage'
import { Message } from './message'
import { FetchSearchResults, NavigateToResult, ScrollToResult } from './update'

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

const makeFixture = (block: TestBlock<typeof SearchBlock>) => {
  const init = block.init
  const update = block.update
  const toParentMessage = toParentMessageFor(block)
  const init_ = init()
  return { block, init, update, toParentMessage, init_ }
}

describe('search', () => {
  test('received open and route notifications retain focus and close cleanup', async () => {
    await Effect.runPromise(
      story(
        SearchBlock,
        init(),
        inMessage(InMessage.RequestedOpen()),
        model(model => expect(model.dialog.isOpen).toBe(true)),
        Command.resolve(
          Dialog.test.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
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
          DialogBlock.Message.CompletedCloseDialog(),
        ),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('typing a query starts a search', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
        const { update, init_ } = makeFixture(executable)

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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('clearing the query resets to Idle', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('same query is ignored', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('new query preserves previous results in Loading state', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('stale results are ignored', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('selecting a result navigates and resets', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
        const { update, init_ } = makeFixture(executable)

        story(
          update,
          given(init_.model),
          message(Message.SelectedSearchResult({ url: '/docs/commands' })),
          model(model => {
            expect(model.query).toBe('')
            expect(model.searchState._tag).toBe('Idle')
          }),
          Command.expectHas(NavigateToResult),
          Command.resolve(
            NavigateToResult,
            Message.CompletedNavigateToResult(),
          ),
          model(model => {
            expect(model.query).toBe('')
          }),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
  test('arrow keys cycle through results', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('clearing the query explicitly resets state', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('close completion clears Search after cleanup, including after a reopen', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
        const { block, update, toParentMessage, init_ } =
          makeFixture(executable)

        const opened = block.receive(init_.model, InMessage.RequestedOpen())
        const queried = update(
          opened.model,
          Message.UpdatedSearchQuery({ query: 'routing' }),
        )
        const transitioned = update(
          queried.model,
          toParentMessage(DialogBinding, DialogBlock.Message.CanceledDialog()),
        )
        const reopened = block.receive(
          transitioned.model,
          InMessage.RequestedOpen(),
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
      }).pipe(Effect.provide(layer)),
    )
  })
  test('route changes clear and close Search while keyboard clearing leaves it open', async () => {
    await Effect.runPromise(
      withBlock(SearchBlock, executable => {
        const { block, update, init_ } = makeFixture(executable)

        const opened = block.receive(init_.model, InMessage.RequestedOpen())
        const queried = update(
          opened.model,
          Message.UpdatedSearchQuery({ query: 'routing' }),
        )
        const cleared = update(queried.model, Message.ClearedSearchQuery())
        const retyped = update(
          cleared.model,
          Message.UpdatedSearchQuery({ query: 'composition' }),
        )
        const changedRoute = block.operations.informRouteChange(retyped.model)
        expect(cleared.model.query).toBe('')
        expect(cleared.model.dialog.isOpen).toBe(true)
        expect(changedRoute.model.query).toBe('')
        expect(changedRoute.model.dialog.isOpen).toBe(false)
        expect(changedRoute.commands?.map(command => command.name)).toEqual([
          'dialog/CloseDialog',
        ])
      }).pipe(Effect.provide(layer)),
    )
  })
})
