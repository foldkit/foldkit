import { Array, Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { RadioGroup, VirtualList } from '@foldkit/ui'

import { ChatVirtualListBlock, HistoryModeRadioGroupBlock } from './controls'
import { VirtualListChatHistorySource } from './domain/domain'
import { UiBlock, layer } from './index'
import { Message } from './message'
import {
  FetchVirtualListChatHistory,
  VirtualListChatDemoBinding,
  VirtualListChatHistoryModeGroupBinding,
} from './virtualListChat'

const uiSubject = { block: UiBlock, layer }
const today = { year: 2026, month: 10, day: 17 }
const olderMessages = (beforeId: number, count: number) =>
  Array.makeBy(count, index => {
    const id = beforeId - count + index
    return { id, body: `Older message ${id}`, isExpanded: false }
  })
const approachedLoadedStart = Story.messageIn(
  VirtualListChatDemoBinding,
  ChatVirtualListBlock.Message.ApproachedLoadedStart({
    distanceToLoadedStartPx: 200,
    containerHeight: 400,
  }),
)
const selectHistoryMode = (value: 'Infinite' | 'Finite') =>
  Story.steps(
    Story.messageIn(
      VirtualListChatHistoryModeGroupBinding,
      HistoryModeRadioGroupBlock.Message.SelectedOption({
        index: value === 'Infinite' ? 0 : 1,
        value,
      }),
    ),
    Story.Command.resolve(
      RadioGroup.test.FocusOption,
      HistoryModeRadioGroupBlock.Message.CompletedFocusOption(),
    ),
  )

it.effect(
  'waits for the loaded-start OutMessage and ignores repeated requests while loading',
  () => {
    return Story.story(
      uiSubject,
      Story.init(today),
      Story.messageIn(
        VirtualListChatDemoBinding,
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
      Story.model(model => {
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatMessages).toHaveLength(24)
      }),
      approachedLoadedStart,
      Story.model(model => {
        expect(model.virtualListChatHistoryLoad).toEqual({
          _tag: 'Loading',
          trigger: 'Scroll',
        })
        expect(model.virtualListChatMessages).toHaveLength(24)
      }),
      Story.Command.expectExact(
        FetchVirtualListChatHistory({
          requestedCount: 64,
          beforeId: 0,
          requestVersion: 1,
          source: VirtualListChatHistorySource.Unbounded(),
        }),
      ),
      Story.models(Story.steps(approachedLoadedStart), (before, after) =>
        expect(after).toEqual(before),
      ),
      Story.Command.expectExact(FetchVirtualListChatHistory),
      Story.Command.resolve(
        FetchVirtualListChatHistory,
        Message.CompletedFetchVirtualListChatHistory({
          requestVersion: 1,
          messages: olderMessages(0, 64),
          source: VirtualListChatHistorySource.Unbounded(),
          page: VirtualList.HistoryPage.More(),
        }),
      ),
    )
  },
)

it.effect(
  'prepends a loaded page without a scroll Command and announces it when scrolling ends',
  () =>
    Story.story(
      uiSubject,
      Story.init(today),
      approachedLoadedStart,
      Story.Command.resolve(
        FetchVirtualListChatHistory,
        Message.CompletedFetchVirtualListChatHistory({
          requestVersion: 1,
          messages: olderMessages(0, 64),
          source: VirtualListChatHistorySource.Unbounded(),
          page: VirtualList.HistoryPage.More(),
        }),
      ),
      Story.model(model => {
        expect(model.virtualListChatMessages).toHaveLength(88)
        expect(
          Option.getOrThrow(Array.head(model.virtualListChatMessages)).id,
        ).toBe(-64)
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatDemo.startPaddingPx).toBe(800)
        expect(model.virtualListChatLoadedOlderCount).toBe(64)
        expect(model.virtualListChatAnnouncedOlderCount).toBe(0)
      }),
      Story.Command.expectNone(),
      Story.messageIn(
        VirtualListChatDemoBinding,
        ChatVirtualListBlock.Message.EndedContainerScroll(),
      ),
      Story.model(model =>
        expect(model.virtualListChatAnnouncedOlderCount).toBe(64),
      ),
    ),
)

it.effect(
  'removes the finite history buffer with the final page and stops fetching',
  () => {
    return Story.story(
      uiSubject,
      Story.init(today),
      selectHistoryMode('Finite'),
      Story.model(model =>
        expect(model.virtualListChatDemo.startPaddingPx).toBe(1200),
      ),
      Story.message(Message.ClickedVirtualListChatPrepend()),
      Story.Command.resolve(
        FetchVirtualListChatHistory,
        Message.CompletedFetchVirtualListChatHistory({
          requestVersion: 2,
          messages: olderMessages(0, 64),
          source: VirtualListChatHistorySource.Finite({ remainingCount: 0 }),
          page: VirtualList.HistoryPage.Complete(),
        }),
      ),
      Story.model(model => {
        expect(model.virtualListChatDemo.startPaddingPx).toBe(0)
        expect(model.virtualListChatHistorySource).toEqual({
          _tag: 'Finite',
          remainingCount: 0,
        })
        expect(model.virtualListChatAnnouncedOlderCount).toBe(64)
      }),
      Story.models(
        Story.steps(
          Story.messageIn(
            VirtualListChatDemoBinding,
            ChatVirtualListBlock.Message.ApproachedLoadedStart({
              distanceToLoadedStartPx: 0,
              containerHeight: 400,
            }),
          ),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
      Story.Command.expectNone(),
    )
  },
)

it.effect(
  'ignores a delayed page after changing history mode and resetting the conversation',
  () => {
    return Story.story(
      uiSubject,
      Story.init(today),
      selectHistoryMode('Finite'),
      Story.message(Message.ClickedVirtualListChatPrepend()),
      Story.models(
        Story.steps(selectHistoryMode('Infinite')),
        (before, after) => {
          expect(after.virtualListChatDemo.id).toBe('virtual-list-chat-demo')
          expect(after.virtualListChatHistoryRequestVersion).toBeGreaterThan(
            before.virtualListChatHistoryRequestVersion,
          )
        },
      ),
      Story.models(
        Story.steps(
          Story.Command.resolve(
            FetchVirtualListChatHistory,
            Message.CompletedFetchVirtualListChatHistory({
              requestVersion: 2,
              messages: olderMessages(0, 32),
              source: VirtualListChatHistorySource.Finite({
                remainingCount: 32,
              }),
              page: VirtualList.HistoryPage.More(),
            }),
          ),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
      Story.model(model => {
        expect(model.virtualListChatMessages).toHaveLength(24)
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatHistorySource._tag).toBe('Unbounded')
      }),
      Story.Command.expectNone(),
    )
  },
)

it.effect(
  'ignores programmatic initial scroll completion when deciding to load history',
  () =>
    Effect.gen(function* () {
      const initialModel = yield* Story.story(uiSubject, Story.init(today))

      return yield* Story.story(
        uiSubject,
        Story.given(initialModel),
        Story.messageIn(
          VirtualListChatDemoBinding,
          ChatVirtualListBlock.Message.CompletedApplyScroll({
            version: initialModel.virtualListChatDemo.pendingScrollVersion,
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
        Story.model(model => {
          expect(model.virtualListChatDemo.scrollTop).toBe(20)
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
          expect(model.virtualListChatMessages).toHaveLength(24)
        }),
      )
    }),
)
