import { Array, Option } from 'effect'
import {
  Command,
  given,
  init,
  message,
  messageFrom,
  messageWith,
  model,
  models,
  steps,
  story,
  withBlock,
} from 'foldkit/story'
import { toParentMessageFor } from 'foldkit/test'
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
const approachedLoadedStart = messageFrom(
  VirtualListChatDemoBinding,
  ChatVirtualListBlock.Message.ApproachedLoadedStart({
    distanceToLoadedStartPx: 200,
    containerHeight: 400,
  }),
)
const selectHistoryMode = (value: 'Infinite' | 'Finite') =>
  steps(
    messageFrom(
      VirtualListChatHistoryModeGroupBinding,
      HistoryModeRadioGroupBlock.Message.SelectedOption({
        index: value === 'Infinite' ? 0 : 1,
        value,
      }),
    ),
    Command.resolve(
      RadioGroup.test.FocusOption,
      HistoryModeRadioGroupBlock.Message.CompletedFocusOption(),
    ),
  )

it.effect(
  'waits for the loaded-start OutMessage and ignores repeated requests while loading',
  () => {
    return story(
      uiSubject,
      init(today),
      messageFrom(
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
      model(model => {
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatMessages).toHaveLength(24)
      }),
      approachedLoadedStart,
      model(model => {
        expect(model.virtualListChatHistoryLoad).toEqual({
          _tag: 'Loading',
          trigger: 'Scroll',
        })
        expect(model.virtualListChatMessages).toHaveLength(24)
      }),
      Command.expectExact(
        FetchVirtualListChatHistory({
          requestedCount: 64,
          beforeId: 0,
          requestVersion: 1,
          source: VirtualListChatHistorySource.Unbounded(),
        }),
      ),
      models(steps(approachedLoadedStart), (before, after) =>
        expect(after).toEqual(before),
      ),
      Command.expectExact(FetchVirtualListChatHistory),
      Command.resolve(
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
    story(
      uiSubject,
      init(today),
      approachedLoadedStart,
      Command.resolve(
        FetchVirtualListChatHistory,
        Message.CompletedFetchVirtualListChatHistory({
          requestVersion: 1,
          messages: olderMessages(0, 64),
          source: VirtualListChatHistorySource.Unbounded(),
          page: VirtualList.HistoryPage.More(),
        }),
      ),
      model(model => {
        expect(model.virtualListChatMessages).toHaveLength(88)
        expect(
          Option.getOrThrow(Array.head(model.virtualListChatMessages)).id,
        ).toBe(-64)
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatDemo.startPaddingPx).toBe(800)
        expect(model.virtualListChatLoadedOlderCount).toBe(64)
        expect(model.virtualListChatAnnouncedOlderCount).toBe(0)
      }),
      Command.expectNone(),
      messageFrom(
        VirtualListChatDemoBinding,
        ChatVirtualListBlock.Message.EndedContainerScroll(),
      ),
      model(model => expect(model.virtualListChatAnnouncedOlderCount).toBe(64)),
    ),
)

it.effect(
  'removes the finite history buffer with the final page and stops fetching',
  () => {
    return story(
      uiSubject,
      init(today),
      selectHistoryMode('Finite'),
      model(model =>
        expect(model.virtualListChatDemo.startPaddingPx).toBe(1200),
      ),
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
      models(
        steps(
          messageFrom(
            VirtualListChatDemoBinding,
            ChatVirtualListBlock.Message.ApproachedLoadedStart({
              distanceToLoadedStartPx: 0,
              containerHeight: 400,
            }),
          ),
        ),
        (before, after) => expect(after).toEqual(before),
      ),
      Command.expectNone(),
    )
  },
)

it.effect(
  'ignores a delayed page after changing history mode and resetting the conversation',
  () => {
    return story(
      uiSubject,
      init(today),
      selectHistoryMode('Finite'),
      message(Message.ClickedVirtualListChatPrepend()),
      models(steps(selectHistoryMode('Infinite')), (before, after) => {
        expect(after.virtualListChatDemo.id).toBe('virtual-list-chat-demo')
        expect(after.virtualListChatHistoryRequestVersion).toBeGreaterThan(
          before.virtualListChatHistoryRequestVersion,
        )
      }),
      models(
        steps(
          Command.resolve(
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
      model(model => {
        expect(model.virtualListChatMessages).toHaveLength(24)
        expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
        expect(model.virtualListChatHistorySource._tag).toBe('Unbounded')
      }),
      Command.expectNone(),
    )
  },
)

it.effect(
  'ignores programmatic initial scroll completion when deciding to load history',
  () =>
    withBlock(uiSubject, executable => {
      const toParentMessage = toParentMessageFor(executable)

      story(
        executable.update,
        given(executable.init(today).model),
        messageWith(model =>
          toParentMessage(
            VirtualListChatDemoBinding,
            ChatVirtualListBlock.Message.CompletedApplyScroll({
              version: model.virtualListChatDemo.pendingScrollVersion,
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
        ),
        model(model => {
          expect(model.virtualListChatDemo.scrollTop).toBe(20)
          expect(model.virtualListChatHistoryLoad._tag).toBe('Idle')
          expect(model.virtualListChatMessages).toHaveLength(24)
        }),
      )
    }),
)
