import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  Tuple,
  pipe,
} from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

import {
  UiDefinition,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'
import {
  ChatVirtualListBlock,
  HistoryModeRadioGroupBlock,
} from './demo/components'
import {
  VirtualListChatHistoryLoad,
  type VirtualListChatHistoryMode,
  VirtualListChatHistorySource,
  type VirtualListChatMessage,
  historyModeForSource,
} from './domain/domain'
import { type CompletedFetchVirtualListChatHistory, Message } from './message'

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

const virtualListChatInitConfig = (
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

export const FetchVirtualListChatHistory = UiDefinition.makeCommand(
  'FetchVirtualListChatHistory',
  {
    args: {
      requestVersion: Schema.Number,
      beforeId: Schema.Number,
      requestedCount: Schema.Number,
      source: VirtualListChatHistorySource,
    },
    messages: [Message.CompletedFetchVirtualListChatHistory],
    handler: function* () {
      return ({ requestVersion, beforeId, requestedCount, source }) =>
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
    },
  },
)

export const VirtualListChatDemoBinding = UiDefinition.makeBinding(
  ChatVirtualListBlock,
  {
    field: 'virtualListChatDemo',
    init: {
      contextToArgs: () =>
        Tuple.make(
          virtualListChatInitConfig(VirtualListChatHistorySource.Unbounded()),
        ),
    },
  },
)

export const requestVirtualListChatHistoryStep = (
  requestedCount: number,
  trigger: 'Scroll' | 'Button',
) =>
  makeStep(model => {
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
  })

const markVirtualListChatHistoryAnnouncedStep = makeStep(model => {
  const nextAnnouncedOlderCount = model.virtualListChatLoadedOlderCount

  if (nextAnnouncedOlderCount <= model.virtualListChatAnnouncedOlderCount) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      virtualListChatAnnouncedOlderCount: () => nextAnnouncedOlderCount,
    }),
  }
})

const foldVirtualListChatOutMessage = UiDefinition.makeOutMessageFold(
  ChatVirtualListBlock,
  {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: ({ distanceToLoadedStartPx, containerHeight }) =>
      makeStep(model => {
        const neededHeight =
          containerHeight * CHAT_HISTORY_PREFETCH_VIEWPORTS -
          distanceToLoadedStartPx
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

        return requestVirtualListChatHistoryStep(requestedCount, 'Scroll')
      }),
    EndedContainerScroll: () => markVirtualListChatHistoryAnnouncedStep,
  },
)

export const VirtualListChatDemoBindingWithOutMessagePolicy =
  VirtualListChatDemoBinding.withOutMessagePolicy({
    fold: foldVirtualListChatOutMessage,
  })

const selectVirtualListChatHistoryModeStep = (
  mode: VirtualListChatHistoryMode,
) =>
  makeStep(model => {
    if (mode === historyModeForSource(model.virtualListChatHistorySource)) {
      return makeNoopStep()
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

    return VirtualListChatDemoBinding.init({
      args: [virtualListChatInitConfig(nextHistorySource)],
      toParentModel: virtualListChatDemo =>
        modifyFields(model, {
          virtualListChatDemo: () => virtualListChatDemo,
          virtualListChatMessages: () => initialVirtualListChatMessages,
          virtualListChatNextId: () => initialVirtualListChatMessages.length,
          virtualListChatHistorySource: () => nextHistorySource,
          virtualListChatHistoryLoad: () => VirtualListChatHistoryLoad.Idle(),
          virtualListChatHistoryRequestVersion: Number.increment,
          virtualListChatLoadedOlderCount: () => 0,
          virtualListChatAnnouncedOlderCount: () => 0,
        }),
    })
  })

export const VirtualListChatHistoryModeGroupBinding = UiDefinition.makeBinding(
  HistoryModeRadioGroupBlock,
  {
    field: 'virtualListChatHistoryModeGroup',
    init: {
      contextToArgs: () => Tuple.make({ id: 'virtual-list-chat-history-mode' }),
    },
  },
).withOutMessagePolicy({
  fold: UiDefinition.makeOutMessageFold(HistoryModeRadioGroupBlock, {
    Selected: ({ value }) => selectVirtualListChatHistoryModeStep(value),
  }),
})

export const updateVirtualListChatMessagesStep = (
  nextMessages: ReadonlyArray<VirtualListChatMessage>,
  nextId?: number,
) =>
  makeStep(model => {
    const nextVirtualListChatNextId =
      nextId === undefined ? model.virtualListChatNextId : nextId
    const updateMessagesStep = makeFieldsStep(() => ({
      virtualListChatMessages: () => nextMessages,
      virtualListChatNextId: () => nextVirtualListChatNextId,
    }))

    return Update.combineSteps([
      updateMessagesStep,
      VirtualListChatDemoBinding.informItemsChanged(
        Array.map(nextMessages, chatMessageKey),
      ),
    ])
  })

export const prependVirtualListChatMessagesStep =
  requestVirtualListChatHistoryStep(
    VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE,
    'Button',
  )

export const handleCompletedFetchVirtualListChatHistory = makeStep(
  (
    model,
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
      return makeNoopStep()
    }

    const shouldAnnounceLoaded =
      model.virtualListChatHistoryLoad.trigger === 'Button'
    const nextMessages = [...messages, ...model.virtualListChatMessages]
    const updateMessagesStep = makeFieldsStep(() => ({
      virtualListChatMessages: () => nextMessages,
      virtualListChatHistorySource: () => source,
      virtualListChatHistoryLoad: () => VirtualListChatHistoryLoad.Idle(),
      virtualListChatLoadedOlderCount: loadedCount =>
        loadedCount + messages.length,
    }))

    return Update.combineSteps([
      updateMessagesStep,
      VirtualListChatDemoBinding.informHistoryPrepended({
        items: nextMessages,
        prependedItems: messages,
        itemToKey: chatMessageKey,
        page,
      }),
      shouldAnnounceLoaded
        ? markVirtualListChatHistoryAnnouncedStep
        : makeNoopStep(),
    ])
  },
)
