import { Array } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { RadioGroup, VirtualList } from '@foldkit/ui'

import { UiLive } from './block'
import { ChatVirtualList, HistoryModeRadioGroup } from './demo/components'
import { VirtualListChatHistorySource } from './domain/domain'
import { Message } from './message'
import { FetchVirtualListChatHistory } from './virtualListChat'

type ChatVirtualListMessage = typeof ChatVirtualList.Message.Type

const args = { today: { year: 2026, month: 10, day: 17 } }

const unboundedChatMessage = (chatMessage: ChatVirtualListMessage) =>
  message(
    Block.deliver(ChatVirtualList, 'virtualListChatUnboundedDemo', chatMessage),
  )

const finiteChatMessage = (chatMessage: ChatVirtualListMessage) =>
  message(
    Block.deliver(ChatVirtualList, 'virtualListChatFiniteDemo', chatMessage),
  )

const selectHistoryMode = (value: 'Infinite' | 'Finite') => [
  message(
    Block.deliver(
      HistoryModeRadioGroup,
      'virtualListChatHistoryModeGroup',
      HistoryModeRadioGroup.Message.SelectedOption({
        index: value === 'Infinite' ? 0 : 1,
        value,
      }),
    ),
  ),
  Command.resolve(
    RadioGroup.test.FocusOption,
    HistoryModeRadioGroup.Message.CompletedFocusOption(),
  ),
]

const olderMessages = (beforeId: number, count: number) =>
  Array.makeBy(count, index => {
    const id = beforeId - count + index
    return { id, body: `Older message ${id}`, isExpanded: false }
  })

describe('VirtualList chat history', () => {
  it.effect(
    'waits for the loaded-start OutMessage and ignores repeated requests while loading',
    () =>
      story(
        UiLive,
        args,
        unboundedChatMessage(
          ChatVirtualList.Message.ObservedContainerScroll({
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
        Command.expectNone(),
        model(model => {
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
          expect(model.virtualListChatMessages).toHaveLength(24)
        }),
        unboundedChatMessage(
          ChatVirtualList.Message.ApproachedLoadedStart({
            distanceToLoadedStartPx: 200,
            containerHeight: 400,
          }),
        ),
        model(model => {
          expect(model.virtualListChatHistoryLoad).toEqual({
            _tag: 'Loading',
            trigger: 'Scroll',
          })
          expect(model.virtualListChatMessages).toHaveLength(24)
        }),
        Command.expectExact(
          FetchVirtualListChatHistory({
            requestVersion: 1,
            beforeId: 0,
            requestedCount: 64,
            source: VirtualListChatHistorySource.Unbounded(),
          }),
        ),
        unboundedChatMessage(
          ChatVirtualList.Message.ApproachedLoadedStart({
            distanceToLoadedStartPx: 200,
            containerHeight: 400,
          }),
        ),
        model(model => {
          expect(model.virtualListChatHistoryLoad).toEqual({
            _tag: 'Loading',
            trigger: 'Scroll',
          })
          expect(model.virtualListChatHistoryRequestVersion).toBe(1)
        }),
        Command.expectExact(FetchVirtualListChatHistory),
        Command.resolve(
          FetchVirtualListChatHistory,
          Message.CompletedFetchVirtualListChatHistory({
            requestVersion: 1,
            messages: [],
            source: VirtualListChatHistorySource.Unbounded(),
            page: VirtualList.HistoryPage.More(),
          }),
        ),
      ),
  )

  it.effect('prepends a loaded page and announces it when scrolling ends', () =>
    story(
      UiLive,
      args,
      unboundedChatMessage(
        ChatVirtualList.Message.ApproachedLoadedStart({
          distanceToLoadedStartPx: 200,
          containerHeight: 400,
        }),
      ),
      Command.resolve(
        FetchVirtualListChatHistory,
        Message.CompletedFetchVirtualListChatHistory({
          requestVersion: 1,
          messages: olderMessages(0, 64),
          source: VirtualListChatHistorySource.Unbounded(),
          page: VirtualList.HistoryPage.More(),
        }),
      ),
      Command.expectNone(),
      model(model => {
        expect(model.virtualListChatMessages).toHaveLength(88)
        expect(Array.head(model.virtualListChatMessages)).toMatchObject({
          value: { id: -64 },
        })
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatDemo.startPaddingPx).toBe(800)
        expect(model.virtualListChatLoadedOlderCount).toBe(64)
        expect(model.virtualListChatAnnouncedOlderCount).toBe(0)
      }),
      unboundedChatMessage(ChatVirtualList.Message.EndedContainerScroll()),
      model(model => {
        expect(model.virtualListChatAnnouncedOlderCount).toBe(64)
      }),
    ),
  )

  it.effect(
    'removes the finite history buffer with the final page and stops fetching',
    () =>
      story(
        UiLive,
        args,
        ...selectHistoryMode('Finite'),
        model(model => {
          expect(model.virtualListChatDemo.startPaddingPx).toBe(1200)
        }),
        message(Message.ClickedVirtualListChatPrepend()),
        Command.resolve(
          FetchVirtualListChatHistory,
          Message.CompletedFetchVirtualListChatHistory({
            requestVersion: 2,
            messages: olderMessages(0, 64),
            source: VirtualListChatHistorySource.Finite({ remainingCount: 0 }),
            page: VirtualList.HistoryPage.Complete(),
          }),
        ),
        model(model => {
          expect(model.virtualListChatDemo.startPaddingPx).toBe(0)
          expect(model.virtualListChatHistorySource).toEqual({
            _tag: 'Finite',
            remainingCount: 0,
          })
          expect(model.virtualListChatAnnouncedOlderCount).toBe(64)
        }),
        finiteChatMessage(
          ChatVirtualList.Message.ApproachedLoadedStart({
            distanceToLoadedStartPx: 0,
            containerHeight: 400,
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        }),
      ),
  )

  it.effect(
    'ignores a delayed page after changing history mode and resetting the conversation',
    () =>
      story(
        UiLive,
        args,
        ...selectHistoryMode('Finite'),
        message(Message.ClickedVirtualListChatPrepend()),
        ...selectHistoryMode('Infinite'),
        model(model => {
          expect(model.virtualListChatDemo.id).toBe('virtual-list-chat-demo')
          expect(model.virtualListChatHistoryRequestVersion).toBe(3)
        }),
        Command.resolve(
          FetchVirtualListChatHistory,
          Message.CompletedFetchVirtualListChatHistory({
            requestVersion: 2,
            messages: olderMessages(0, 32),
            source: VirtualListChatHistorySource.Finite({ remainingCount: 32 }),
            page: VirtualList.HistoryPage.More(),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.virtualListChatMessages).toHaveLength(24)
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
          expect(model.virtualListChatHistorySource._tag).toBe('Unbounded')
        }),
      ),
  )

  it.effect(
    'ignores programmatic initial scroll completion when deciding to load history',
    () =>
      story(
        UiLive,
        args,
        unboundedChatMessage(
          ChatVirtualList.Message.CompletedApplyScroll({
            version: 0,
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
        model(model => {
          expect(model.virtualListChatDemo.scrollTop).toBe(20)
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
          expect(model.virtualListChatMessages).toHaveLength(24)
        }),
      ),
  )
})
