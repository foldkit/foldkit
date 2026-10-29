import { Array } from 'effect'
import { toParentMessage } from 'foldkit/test'
import { expect, test } from 'vitest'

import { VirtualList } from '@foldkit/ui'

import {
  ChatVirtualListBlock,
  HistoryModeRadioGroupBlock,
} from './demo/components'
import { VirtualListChatHistorySource } from './domain/domain'
import { init } from './init'
import { Message } from './message'
import { update } from './update'
import {
  VirtualListChatDemoBinding,
  VirtualListChatHistoryModeGroupBinding,
} from './virtualListChat'

type ChatVirtualListBlockMessage = typeof ChatVirtualListBlock.Message.Type

const chatMessage = (message: ChatVirtualListBlockMessage) =>
  toParentMessage(VirtualListChatDemoBinding, message)

const selectHistoryMode = (value: 'Infinite' | 'Finite') =>
  toParentMessage(
    VirtualListChatHistoryModeGroupBinding,
    HistoryModeRadioGroupBlock.Message.SelectedOption({
      index: value === 'Infinite' ? 0 : 1,
      value,
    }),
  )

const olderMessages = (beforeId: number, count: number) =>
  Array.makeBy(count, index => {
    const id = beforeId - count + index
    return { id, body: `Older message ${id}`, isExpanded: false }
  })

const initialModel = () => init({ year: 2026, month: 10, day: 17 }).model

test('waits for the loaded-start OutMessage and ignores repeated requests while loading', () => {
  const initial = initialModel()
  const observed = update(
    initial,
    chatMessage(
      ChatVirtualListBlock.Message.ObservedContainerScroll({
        scrollTop: 40,
        scrollHeight: 2000,
        containerHeight: 400,
        anchor: VirtualList.ObservedAnchor.Row({
          key: '0',
          index: 0,
          viewportOffset: 6,
        }),
      }),
    ),
  )

  expect(observed.model.virtualListChatHistoryLoad._tag).toBe('Idle')
  expect(observed.model.virtualListChatMessages).toHaveLength(24)

  const approached = chatMessage(
    ChatVirtualListBlock.Message.ApproachedLoadedStart({
      distanceToLoadedStartPx: 200,
      containerHeight: 400,
    }),
  )
  const requested = update(observed.model, approached)

  expect(requested.model.virtualListChatHistoryLoad).toEqual({
    _tag: 'Loading',
    trigger: 'Scroll',
  })
  expect(requested.model.virtualListChatMessages).toHaveLength(24)
  expect(requested.commands).toHaveLength(1)
  expect(Array.head(requested.commands ?? [])).toMatchObject({
    value: {
      name: 'Ui/FetchVirtualListChatHistory',
      args: { requestedCount: 64, beforeId: 0, requestVersion: 1 },
    },
  })

  const repeated = update(requested.model, approached)

  expect(repeated.model).toEqual(requested.model)
  expect(repeated.commands ?? []).toEqual([])
})

test('prepends a loaded page without a scroll Command and announces it when scrolling ends', () => {
  const requested = update(
    initialModel(),
    chatMessage(
      ChatVirtualListBlock.Message.ApproachedLoadedStart({
        distanceToLoadedStartPx: 200,
        containerHeight: 400,
      }),
    ),
  )
  const completed = update(
    requested.model,
    Message.CompletedFetchVirtualListChatHistory({
      requestVersion: requested.model.virtualListChatHistoryRequestVersion,
      messages: olderMessages(0, 64),
      source: VirtualListChatHistorySource.Unbounded(),
      page: VirtualList.HistoryPage.More(),
    }),
  )

  expect(completed.model.virtualListChatMessages).toHaveLength(88)
  expect(Array.head(completed.model.virtualListChatMessages)).toMatchObject({
    value: { id: -64 },
  })
  expect(completed.model.virtualListChatHistoryLoad._tag).toBe('Idle')
  expect(completed.model.virtualListChatDemo.startPaddingPx).toBe(800)
  expect(completed.model.virtualListChatLoadedOlderCount).toBe(64)
  expect(completed.model.virtualListChatAnnouncedOlderCount).toBe(0)
  expect(completed.commands ?? []).toEqual([])

  const ended = update(
    completed.model,
    chatMessage(ChatVirtualListBlock.Message.EndedContainerScroll()),
  )

  expect(ended.model.virtualListChatAnnouncedOlderCount).toBe(64)
})

test('removes the finite history buffer with the final page and stops fetching', () => {
  const finite = update(initialModel(), selectHistoryMode('Finite'))
  const requested = update(
    finite.model,
    Message.ClickedVirtualListChatPrepend(),
  )
  const completed = update(
    requested.model,
    Message.CompletedFetchVirtualListChatHistory({
      requestVersion: requested.model.virtualListChatHistoryRequestVersion,
      messages: olderMessages(0, 64),
      source: VirtualListChatHistorySource.Finite({ remainingCount: 0 }),
      page: VirtualList.HistoryPage.Complete(),
    }),
  )

  expect(finite.model.virtualListChatDemo.startPaddingPx).toBe(1200)
  expect(completed.model.virtualListChatDemo.startPaddingPx).toBe(0)
  expect(completed.model.virtualListChatHistorySource).toEqual({
    _tag: 'Finite',
    remainingCount: 0,
  })
  expect(completed.model.virtualListChatAnnouncedOlderCount).toBe(64)

  const approached = update(
    completed.model,
    chatMessage(
      ChatVirtualListBlock.Message.ApproachedLoadedStart({
        distanceToLoadedStartPx: 0,
        containerHeight: 400,
      }),
    ),
  )

  expect(approached.model).toEqual(completed.model)
  expect(approached.commands ?? []).toEqual([])
})

test('ignores a delayed page after changing history mode and resetting the conversation', () => {
  const finite = update(initialModel(), selectHistoryMode('Finite'))
  const requested = update(
    finite.model,
    Message.ClickedVirtualListChatPrepend(),
  )
  const infinite = update(requested.model, selectHistoryMode('Infinite'))
  const completed = update(
    infinite.model,
    Message.CompletedFetchVirtualListChatHistory({
      requestVersion: requested.model.virtualListChatHistoryRequestVersion,
      messages: olderMessages(0, 32),
      source: VirtualListChatHistorySource.Finite({ remainingCount: 32 }),
      page: VirtualList.HistoryPage.More(),
    }),
  )

  expect(infinite.model.virtualListChatDemo.id).toBe('virtual-list-chat-demo')
  expect(infinite.model.virtualListChatHistoryRequestVersion).toBeGreaterThan(
    requested.model.virtualListChatHistoryRequestVersion,
  )
  expect(completed.model).toEqual(infinite.model)
  expect(completed.model.virtualListChatMessages).toHaveLength(24)
  expect(completed.model.virtualListChatHistoryLoad._tag).toBe('Idle')
  expect(completed.model.virtualListChatHistorySource._tag).toBe('Unbounded')
  expect(completed.commands ?? []).toEqual([])
})

test('ignores programmatic initial scroll completion when deciding to load history', () => {
  const initial = initialModel()
  const completed = update(
    initial,
    chatMessage(
      ChatVirtualListBlock.Message.CompletedApplyScroll({
        version: initial.virtualListChatDemo.pendingScrollVersion,
        outcome: {
          _tag: 'Applied',
          scrollTop: 20,
          scrollHeight: 2000,
          containerHeight: 400,
          anchor: VirtualList.ObservedAnchor.Row({
            key: '0',
            index: 0,
            viewportOffset: 6,
          }),
        },
      }),
    ),
  )

  expect(completed.model.virtualListChatDemo.scrollTop).toBe(20)
  expect(completed.model.virtualListChatHistoryLoad._tag).toBe('Idle')
  expect(completed.model.virtualListChatMessages).toHaveLength(24)
})
