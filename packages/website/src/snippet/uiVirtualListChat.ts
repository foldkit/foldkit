import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

const ChatMessage = Schema.Struct({ id: Schema.String, body: Schema.String })
type ChatMessage = typeof ChatMessage.Type

const HistoryResponse = Schema.Struct({
  messages: Schema.Array(ChatMessage),
  hasMore: Schema.Boolean,
})
type HistoryResponse = typeof HistoryResponse.Type

const HistoryLoad = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Failed: {},
  Complete: {},
})
type HistoryLoad = typeof HistoryLoad.Type

const MessageListBlock = VirtualList.makeBlock<ChatMessage>()
const historyRows: VirtualList.HistoryRows<ChatMessage> = {
  itemToKey: message => message.id,
  dynamicRowHeights: true,
  itemToEstimatedRowHeightPx: message => (message.body.length > 120 ? 96 : 64),
}

const Model = Schema.Struct({
  messages: Schema.Array(ChatMessage),
  messageList: MessageListBlock.Model,
  historyLoad: HistoryLoad,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ReceivedMessage: { message: ChatMessage },
  ClickedRetryHistory: {},
  SucceededFetchHistory: { response: HistoryResponse },
  FailedFetchHistory: {},
})
type Message = typeof Message.Type

export const MessageListExampleKey = Symbol('MessageListExample')
export const MessageListExampleBlock = Block.make('MessageListExample', {
  key: MessageListExampleKey,
  InitArgs: Schema.Tuple([Schema.Array(ChatMessage)]),
  view: { kind: 'Element' },
  Model,
  Message,
})
const {
  makeFieldsStep,
  makeNoopStep,
  makeStep,
  makeCommand,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = MessageListExampleBlock

const FetchHistory = makeCommand('FetchHistory', {
  args: { maybeBeforeId: Schema.Option(Schema.String) },
  messages: [Message.SucceededFetchHistory, Message.FailedFetchHistory],
  handler: function* () {
    return ({ maybeBeforeId }) =>
      Effect.gen(function* () {
        const query = Option.match(maybeBeforeId, {
          onNone: () => '',
          onSome: beforeId => `?before=${encodeURIComponent(beforeId)}`,
        })
        const response = yield* Effect.tryPromise(() =>
          fetch(`/api/messages${query}`),
        )

        if (!response.ok) {
          return yield* Effect.fail(new Error('Could not load older messages'))
        }

        const body = yield* Effect.tryPromise(() => response.json())
        const history = yield* Schema.decodeUnknownEffect(HistoryResponse)(body)

        return Message.SucceededFetchHistory({ response: history })
      }).pipe(Effect.catch(() => Effect.succeed(Message.FailedFetchHistory())))
  },
})

const requestHistory = makeStep(model => {
  if (
    model.historyLoad._tag === 'Loading' ||
    model.historyLoad._tag === 'Complete'
  ) {
    return { model }
  }

  return {
    model: modifyFields(model, { historyLoad: () => HistoryLoad.Loading() }),
    commands: [
      FetchHistory({
        maybeBeforeId: Option.map(
          Array.head(model.messages),
          message => message.id,
        ),
      }),
    ],
  }
})

const MessageListBinding = makeRequiredFieldBinding(MessageListBlock, {
  field: 'messageList',
  init: {
    contextToArgs: () => [
      {
        id: 'message-list',
        rowHeightPx: 64,
        initialScroll: { target: VirtualList.ScrollTarget.End() },
        followEnd: { thresholdPx: 8 },
        history: { reservePx: 800, prefetchViewports: 3 },
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(MessageListBlock, {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: () => requestHistory,
    EndedContainerScroll: makeNoopStep,
  }),
})

const MessageListExampleComposition = makeComposition({
  bindings: [MessageListBinding],
})
const init = MessageListExampleComposition.makeInit(initialMessages => ({
  model: { messages: initialMessages, historyLoad: HistoryLoad.Idle() },
}))
const update = MessageListExampleComposition.makeUpdate({
  ReceivedMessage: (model, { message }) => {
    const nextMessages = Array.append(model.messages, message)

    return Update.combineSteps(model, [
      makeFieldsStep(() => ({ messages: () => nextMessages })),
      MessageListBinding.informOfItemsChanged(
        Array.map(nextMessages, historyRows.itemToKey),
      ),
    ])
  },
  ClickedRetryHistory: requestHistory,
  SucceededFetchHistory: (model, { response }) => {
    const nextMessages = [...response.messages, ...model.messages]

    return Update.combineSteps(model, [
      makeFieldsStep(() => ({
        messages: () => nextMessages,
        historyLoad: () =>
          response.hasMore ? HistoryLoad.Idle() : HistoryLoad.Complete(),
      })),
      MessageListBinding.informOfHistoryPrepended({
        items: nextMessages,
        prependedItems: response.messages,
        itemToKey: historyRows.itemToKey,
        page: response.hasMore
          ? VirtualList.HistoryPage.More()
          : VirtualList.HistoryPage.Complete(),
      }),
    ])
  },
  FailedFetchHistory: makeFieldsStep(() => ({
    historyLoad: () => HistoryLoad.Failed(),
  })),
})
const view = MessageListExampleComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.div(
        [h.Role('status')],
        [
          HistoryLoad.match(model.historyLoad, {
            Idle: () => '',
            Loading: () => 'Loading older messages',
            Failed: () => 'Could not load older messages',
            Complete: () => 'All older messages loaded',
          }),
        ],
      ),
      ...(model.historyLoad._tag === 'Failed'
        ? [h.button([h.OnClick(Message.ClickedRetryHistory())], ['Retry'])]
        : []),
      h.block(
        MessageListBinding.embedView({
          slotId: 'message-list',
          model: model.messageList,
          viewInputs: {
            items: model.messages,
            ...historyRows,
            itemToView: message =>
              h.div([h.Class('rounded-xl px-3 py-2')], [message.body]),
            accessibleSet:
              model.historyLoad._tag === 'Complete'
                ? VirtualList.AccessibleSet.Loaded()
                : VirtualList.AccessibleSet.Unknown(),
            contentAlignment: 'End',
            containerClassName: 'h-96 overflow-auto',
          },
        }),
      ),
    ],
  ),
)

export const layer = MessageListExampleBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: FetchHistory.layer,
}).pipe(Layer.provide(VirtualList.layer))
