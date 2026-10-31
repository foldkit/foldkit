import { Array, Effect, Match, Number, Option, Schema, pipe } from 'effect'
import { Command } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

import {
  VirtualListChatHistoryLoad,
  type VirtualListChatHistoryMode,
  VirtualListChatHistorySource,
  type VirtualListChatMessage,
  historyModeForSource,
} from './domain/domain'
import { type CompletedFetchVirtualListChatHistory, Message } from './message'
import type { Model } from './model'

export const INITIAL_CHAT_MESSAGE_COUNT = 24
export const UNBOUNDED_CHAT_START_RUNWAY_PX = 800
export const FINITE_CHAT_START_RUNWAY_PX = 1_200
export const CHAT_HISTORY_PREFETCH_VIEWPORTS = 6
export const COLLAPSED_HISTORY_MESSAGE_HEIGHT_PX = 48

const VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE = 32
const VIRTUAL_LIST_CHAT_UNBOUNDED_HISTORY_BATCH_SIZE = 64
const VIRTUAL_LIST_CHAT_FINITE_HISTORY_COUNT = 64
const VIRTUAL_LIST_CHAT_FETCH_DELAY = '150 millis'

const chatBodies = [
  'Can you review the latest build?',
  'Yep, the navigation fix looks good.',
  'I also checked the keyboard flow and the focus order is stable.',
  'Perfect. I’ll queue the release once CI finishes.',
]

export const initialVirtualListChatMessages: ReadonlyArray<VirtualListChatMessage> =
  Array.makeBy(INITIAL_CHAT_MESSAGE_COUNT, index => ({
    id: index,
    body: Option.getOrElse(
      Array.get(chatBodies, index % chatBodies.length),
      () => 'Message',
    ),
    isExpanded: index % 7 === 0,
  }))

export const chatMessageKey = (message: VirtualListChatMessage): string =>
  globalThis.String(message.id)

export const virtualListChatInitConfig = (
  source: VirtualListChatHistorySource,
): VirtualList.InitConfig => ({
  id: VirtualListChatHistorySource.match(source, {
    Unbounded: () => 'virtual-list-chat-demo',
    Finite: () => 'virtual-list-chat-demo-finite',
  }),
  rowHeightPx: 64,
  history: {
    reservePx: VirtualListChatHistorySource.match(source, {
      Unbounded: () => UNBOUNDED_CHAT_START_RUNWAY_PX,
      Finite: () => FINITE_CHAT_START_RUNWAY_PX,
    }),
    prefetchViewports: CHAT_HISTORY_PREFETCH_VIEWPORTS,
  },
  initialScroll: { target: VirtualList.ScrollTarget.End() },
  followEnd: { thresholdPx: 8 },
})

// COMMAND

export const FetchVirtualListChatHistory = Command.define(
  'FetchVirtualListChatHistory',
  {
    args: {
      requestVersion: Schema.Number,
      beforeId: Schema.Number,
      requestedCount: Schema.Number,
      source: VirtualListChatHistorySource,
    },
    messages: [Message.CompletedFetchVirtualListChatHistory],
  },
)

export const fetchVirtualListChatHistory = ({
  requestVersion,
  beforeId,
  requestedCount,
  source,
}: Readonly<{
  requestVersion: number
  beforeId: number
  requestedCount: number
  source: VirtualListChatHistorySource
}>) =>
  VirtualListChatHistorySource.match(source, {
    Unbounded: () => Effect.void,
    Finite: () => Effect.sleep(VIRTUAL_LIST_CHAT_FETCH_DELAY),
  }).pipe(
    Effect.map(() => {
      const count = VirtualListChatHistorySource.match(source, {
        Unbounded: () => requestedCount,
        Finite: ({ remainingCount }) =>
          Math.min(requestedCount, remainingCount),
      })
      const messages = Array.makeBy(count, index => {
        const id = beforeId - count + index
        return { id, body: `Older message ${id}`, isExpanded: false }
      })
      const nextSource = VirtualListChatHistorySource.match(source, {
        Unbounded: () => VirtualListChatHistorySource.Unbounded(),
        Finite: ({ remainingCount }) =>
          VirtualListChatHistorySource.Finite({
            remainingCount: remainingCount - count,
          }),
      })
      const page = VirtualListChatHistorySource.match(source, {
        Unbounded: () => VirtualList.HistoryPage.More(),
        Finite: ({ remainingCount }) =>
          remainingCount - count <= 0
            ? VirtualList.HistoryPage.Complete()
            : VirtualList.HistoryPage.More(),
      })

      return Message.CompletedFetchVirtualListChatHistory({
        requestVersion,
        messages,
        source: nextSource,
        page,
      })
    }),
  )

// STEPS

export const requestVirtualListChatHistoryStep = (
  model: Model,
  requestedCount: number,
  trigger: 'Scroll' | 'Button',
) => {
  if (model.virtualListChatHistoryLoad._tag === 'Loading') {
    return { model }
  }

  if (
    model.virtualListChatHistorySource._tag === 'Finite' &&
    model.virtualListChatHistorySource.remainingCount <= 0
  ) {
    return { model }
  }

  const count = Math.max(0, requestedCount)

  if (count <= 0) {
    return { model }
  }

  const firstId = pipe(
    model.virtualListChatMessages,
    Array.head,
    Option.match({
      onNone: () => model.virtualListChatNextId,
      onSome: message => message.id,
    }),
  )
  const nextVirtualListChatHistoryRequestVersion =
    model.virtualListChatHistoryRequestVersion + 1

  return {
    model: modifyFields(model, {
      virtualListChatHistoryLoad: () =>
        VirtualListChatHistoryLoad.Loading({ trigger }),
      virtualListChatHistoryRequestVersion: () =>
        nextVirtualListChatHistoryRequestVersion,
    }),
    commands: [
      FetchVirtualListChatHistory({
        requestVersion: nextVirtualListChatHistoryRequestVersion,
        beforeId: firstId,
        requestedCount: count,
        source: model.virtualListChatHistorySource,
      }),
    ],
  }
}

export const prependVirtualListChatMessagesStep = (model: Model) =>
  requestVirtualListChatHistoryStep(
    model,
    VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE,
    'Button',
  )

export const requestVirtualListChatHistoryOnApproachStep = (
  model: Model,
  {
    distanceToLoadedStartPx,
    containerHeight,
  }: Readonly<{ distanceToLoadedStartPx: number; containerHeight: number }>,
) => {
  const neededHeight =
    containerHeight * CHAT_HISTORY_PREFETCH_VIEWPORTS - distanceToLoadedStartPx
  const minimumCount = VirtualListChatHistorySource.match(
    model.virtualListChatHistorySource,
    {
      Unbounded: () => VIRTUAL_LIST_CHAT_UNBOUNDED_HISTORY_BATCH_SIZE,
      Finite: () => VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE,
    },
  )
  const requestedCount = Math.max(
    minimumCount,
    Math.ceil(neededHeight / COLLAPSED_HISTORY_MESSAGE_HEIGHT_PX),
  )

  return requestVirtualListChatHistoryStep(model, requestedCount, 'Scroll')
}

export const markVirtualListChatHistoryAnnouncedStep = (model: Model) => {
  const nextAnnouncedOlderCount = model.virtualListChatLoadedOlderCount

  if (nextAnnouncedOlderCount <= model.virtualListChatAnnouncedOlderCount) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      virtualListChatAnnouncedOlderCount: () => nextAnnouncedOlderCount,
    }),
  }
}

export const updateVirtualListChatMessagesStep = (
  model: Model,
  nextMessages: ReadonlyArray<VirtualListChatMessage>,
  nextId?: number,
) => {
  const nextVirtualListChatNextId =
    nextId === undefined ? model.virtualListChatNextId : nextId

  return {
    model: modifyFields(model, {
      virtualListChatMessages: () => nextMessages,
      virtualListChatNextId: () => nextVirtualListChatNextId,
    }),
    messages: [
      model.virtualListChatDemo.send(
        VirtualList.informItemsChanged(Array.map(nextMessages, chatMessageKey)),
      ),
    ],
  }
}

export const handleCompletedFetchVirtualListChatHistory = (
  model: Model,
  {
    requestVersion,
    messages,
    source,
    page,
  }: CompletedFetchVirtualListChatHistory,
) => {
  if (
    model.virtualListChatHistoryLoad._tag === 'Idle' ||
    requestVersion !== model.virtualListChatHistoryRequestVersion
  ) {
    return { model }
  }

  const shouldAnnounceLoaded =
    model.virtualListChatHistoryLoad.trigger === 'Button'
  const nextMessages = [...messages, ...model.virtualListChatMessages]
  const nextModel = modifyFields(model, {
    virtualListChatMessages: () => nextMessages,
    virtualListChatHistorySource: () => source,
    virtualListChatHistoryLoad: () => VirtualListChatHistoryLoad.Idle(),
    virtualListChatLoadedOlderCount: loadedCount =>
      loadedCount + messages.length,
  })
  const historyPrepend = model.virtualListChatDemo.send(
    VirtualList.informHistoryPrepended({
      items: nextMessages,
      prependedItems: messages,
      itemToKey: chatMessageKey,
      page,
    }),
  )

  if (shouldAnnounceLoaded) {
    const historyAnnouncement =
      markVirtualListChatHistoryAnnouncedStep(nextModel)
    return { model: historyAnnouncement.model, messages: [historyPrepend] }
  } else {
    return { model: nextModel, messages: [historyPrepend] }
  }
}

export const selectVirtualListChatHistoryModeStep = (
  model: Model,
  mode: VirtualListChatHistoryMode,
  chatListForSource: (
    source: VirtualListChatHistorySource,
  ) => Model['virtualListChatDemo'],
) => {
  if (mode === historyModeForSource(model.virtualListChatHistorySource)) {
    return { model }
  }

  const nextHistorySource = Match.value(mode).pipe(
    Match.withReturnType<VirtualListChatHistorySource>(),
    Match.when('Infinite', () => VirtualListChatHistorySource.Unbounded()),
    Match.when('Finite', () =>
      VirtualListChatHistorySource.Finite({
        remainingCount: VIRTUAL_LIST_CHAT_FINITE_HISTORY_COUNT,
      }),
    ),
    Match.exhaustive,
  )

  return {
    model: modifyFields(model, {
      virtualListChatDemo: () => chatListForSource(nextHistorySource),
      virtualListChatMessages: () => initialVirtualListChatMessages,
      virtualListChatNextId: () => initialVirtualListChatMessages.length,
      virtualListChatHistorySource: () => nextHistorySource,
      virtualListChatHistoryLoad: () => VirtualListChatHistoryLoad.Idle(),
      virtualListChatHistoryRequestVersion: Number.increment,
      virtualListChatLoadedOlderCount: () => 0,
      virtualListChatAnnouncedOlderCount: () => 0,
    }),
  }
}
