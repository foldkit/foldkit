import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
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

const HistoryLoad = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Failed: {},
  Complete: {},
})

const MessageList = VirtualList.makeBlock<ChatMessage>()

const historyRows: VirtualList.HistoryRows<ChatMessage> = {
  itemToKey: message => message.id,
  dynamicRowHeights: true,
  itemToEstimatedRowHeightPx: message => (message.body.length > 120 ? 96 : 64),
}

const Message = defineMessageUnion({
  ReceivedMessage: { message: ChatMessage },
  ClickedRetryHistory: {},
  SucceededFetchHistory: { response: HistoryResponse },
  FailedFetchHistory: {},
})

const FetchHistory = Command.define('FetchHistory', {
  args: { maybeBeforeId: Schema.Option(Schema.String) },
  messages: [Message.SucceededFetchHistory, Message.FailedFetchHistory],
})

const Model = Schema.Struct({
  messages: Schema.Array(ChatMessage),
  messageList: MessageList,
  historyLoad: HistoryLoad,
})
type Model = typeof Model.Type

export class Conversation extends Block<
  Conversation,
  Readonly<{ initialMessages: ReadonlyArray<ChatMessage> }>
>()('Conversation', {
  Model,
  Message,
  Command: [FetchHistory],
}) {}

const fetchHistory = ({
  maybeBeforeId,
}: Readonly<{ maybeBeforeId: Option.Option<string> }>) =>
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

const requestHistoryStep = (model: Model) => {
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
}

export const ConversationLive = Conversation.make(
  Effect.fn(function* (_id, { initialMessages }) {
    const messageList = yield* new MessageList('messageList', {
      id: 'message-list',
      rowHeightPx: 64,
      initialScroll: { target: VirtualList.ScrollTarget.End() },
      followEnd: { thresholdPx: 8 },
      history: { reservePx: 800, prefetchViewports: 3 },
    })

    return {
      model: {
        messages: initialMessages,
        messageList,
        historyLoad: HistoryLoad.Idle(),
      },

      update: {
        // Tell the list which keys it now holds whenever the items change
        ReceivedMessage: (model, { message }) => {
          const nextMessages = Array.append(model.messages, message)

          return {
            model: modifyFields(model, { messages: () => nextMessages }),
            messages: [
              model.messageList.send(
                VirtualList.informItemsChanged(
                  Array.map(nextMessages, historyRows.itemToKey),
                ),
              ),
            ],
          }
        },

        ClickedRetryHistory: requestHistoryStep,

        // Prepending history keeps the visible rows in place
        SucceededFetchHistory: (model, { response }) => {
          const nextMessages = [...response.messages, ...model.messages]

          return {
            model: modifyFields(model, {
              messages: () => nextMessages,
              historyLoad: () =>
                response.hasMore ? HistoryLoad.Idle() : HistoryLoad.Complete(),
            }),
            messages: [
              model.messageList.send(
                VirtualList.informHistoryPrepended({
                  items: nextMessages,
                  prependedItems: response.messages,
                  itemToKey: historyRows.itemToKey,
                  page: response.hasMore
                    ? VirtualList.HistoryPage.More()
                    : VirtualList.HistoryPage.Complete(),
                }),
              ),
            ],
          }
        },

        FailedFetchHistory: model => ({
          model: modifyFields(model, {
            historyLoad: () => HistoryLoad.Failed(),
          }),
        }),

        // Load older messages when the reader scrolls near the start
        ...messageList.on({
          ApproachedLoadedStart: requestHistoryStep,
        }),
      },

      commands: { FetchHistory: fetchHistory },

      view: (model, h) =>
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
              ? [
                  h.button(
                    [h.OnClick(Message.ClickedRetryHistory())],
                    ['Retry'],
                  ),
                ]
              : []),
            model.messageList.view({
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
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(MessageList.Live))
