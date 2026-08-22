import {
  Array,
  DateTime,
  Duration,
  Effect,
  Match as M,
  Option,
  Queue,
  Schema as S,
  Stream,
  String,
} from 'effect'
import {
  Command,
  ManagedResource,
  Runtime,
  Subscription,
  type Update,
} from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

const getZonedTime = DateTime.now.pipe(
  Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())),
)

// MODEL

const ChatMessage = S.Struct({
  text: S.String,
  zoned: S.DateTimeZoned,
  isSent: S.Boolean,
})

type ChatMessage = typeof ChatMessage.Type

const ChatSocket = ManagedResource.tag<WebSocket>()('ChatSocket')
type ChatSocketService = ManagedResource.ServiceOf<typeof ChatSocket>

export const ConnectionDisconnected = ts('ConnectionDisconnected')
export const ConnectionConnecting = ts('ConnectionConnecting')
export const ConnectionConnected = ts('ConnectionConnected')
export const ConnectionError = ts('ConnectionError', { error: S.String })

const ConnectionState = S.Union([
  ConnectionDisconnected,
  ConnectionConnecting,
  ConnectionConnected,
  ConnectionError,
])
type ConnectionState = typeof ConnectionState.Type

export const Model = S.Struct({
  connection: ConnectionState,
  messages: S.Array(ChatMessage),
  messageInput: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedConnect: {},
  Connected: {},
  Disconnected: {},
  FailedConnect: { error: S.String },
  UpdatedMessageInput: { value: S.String },
  SubmittedMessage: {},
  SucceededSendMessage: { text: S.String },
  ReceivedMessage: { text: S.String },
  TimestampedMessage: {
    text: S.String,
    zoned: S.DateTimeZoned,
    isSent: S.Boolean,
  },
})

export type Message = typeof Message.Type

// UPDATE

type UpdateReturn = Update.Return<Model, Message, ChatSocketService>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedConnect: () => ({
      model: evo(model, {
        connection: () => ConnectionConnecting(),
      }),
    }),

    Connected: () => ({
      model: evo(model, {
        connection: () => ConnectionConnected(),
      }),
    }),

    Disconnected: () => ({
      model: evo(model, {
        connection: () => ConnectionDisconnected(),
        messages: () => [],
      }),
    }),

    FailedConnect: ({ error }) => ({
      model: evo(model, {
        connection: () => ConnectionError({ error }),
      }),
    }),

    UpdatedMessageInput: ({ value }) => ({
      model: evo(model, {
        messageInput: () => value,
      }),
    }),

    SubmittedMessage: () => {
      const trimmedMessage = model.messageInput.trim()

      if (String.isEmpty(trimmedMessage)) {
        return { model }
      }

      return M.value(model.connection).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tag('ConnectionConnected', () => ({
          model: evo(model, {
            messageInput: () => '',
          }),
          commands: [SendMessage({ text: trimmedMessage })],
        })),
        M.orElse(() => ({ model })),
      )
    },

    SucceededSendMessage: ({ text }) => ({
      model,
      commands: [TimestampSentMessage({ text })],
    }),

    ReceivedMessage: ({ text }) => ({
      model,
      commands: [TimestampReceivedMessage({ text })],
    }),

    TimestampedMessage: ({ text, zoned, isSent }) => {
      const newMessage = ChatMessage.make({ text, zoned, isSent })

      return {
        model: evo(model, {
          messages: messages => [...messages, newMessage],
        }),
      }
    },
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    connection: ConnectionDisconnected(),
    messages: [],
    messageInput: '',
  },
})

// COMMAND

export const TimestampSentMessage = Command.define('TimestampSentMessage', {
  args: { text: S.String },
  messages: [Message.TimestampedMessage],
  execute: ({ text }) =>
    getZonedTime.pipe(
      Effect.map(zoned =>
        Message.TimestampedMessage({ text, zoned, isSent: true }),
      ),
    ),
})

export const TimestampReceivedMessage = Command.define(
  'TimestampReceivedMessage',
  {
    args: { text: S.String },
    messages: [Message.TimestampedMessage],
    execute: ({ text }) =>
      getZonedTime.pipe(
        Effect.map(zoned =>
          Message.TimestampedMessage({ text, zoned, isSent: false }),
        ),
      ),
  },
)

export const SendMessage = Command.define('SendMessage', {
  args: { text: S.String },
  messages: [Message.SucceededSendMessage, Message.FailedConnect],
  execute: ({ text }) =>
    ChatSocket.get.pipe(
      Effect.flatMap(socket =>
        Effect.sync(() => {
          socket.send(text)
          return Message.SucceededSendMessage({ text })
        }),
      ),
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.succeed(Message.FailedConnect({ error: 'Socket unavailable' })),
      ),
    ),
})

// MANAGED RESOURCE

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    chatSocket: entry(S.Option(S.Null), {
      resource: ChatSocket,
      modelToMaybeRequirements: model =>
        M.value(model.connection).pipe(
          M.tag('ConnectionConnecting', () => Option.some(null)),
          M.tag('ConnectionConnected', () => Option.some(null)),
          M.orElse(() => Option.none()),
        ),
      acquire: () =>
        Effect.callback<WebSocket, Error>(resume => {
          const ws = new WebSocket(WS_URL)

          const handleOpen = () => {
            ws.removeEventListener('error', handleError)
            resume(Effect.succeed(ws))
          }

          const handleError = () => {
            ws.removeEventListener('open', handleOpen)
            resume(Effect.fail(new Error('Failed to connect to WebSocket')))
          }

          ws.addEventListener('open', handleOpen)
          ws.addEventListener('error', handleError)

          return Effect.sync(() => {
            ws.removeEventListener('open', handleOpen)
            ws.removeEventListener('error', handleError)
          })
        }).pipe(
          Effect.timeout(Duration.millis(CONNECTION_TIMEOUT_MS)),
          Effect.catchTag('TimeoutError', () =>
            Effect.fail(new Error('Connection timeout')),
          ),
        ),
      release: socket =>
        Effect.sync(() => {
          socket.close()
        }),
      onAcquired: () => Message.Connected(),
      onReleased: () => Message.Disconnected(),
      onAcquireError: error =>
        Message.FailedConnect({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
    }),
  }),
)

// SUBSCRIPTION

const streamChatSocketMessages = (socket: WebSocket) =>
  Stream.callback<
    | typeof Message.ReceivedMessage.Type
    | typeof Message.Disconnected.Type
    | typeof Message.FailedConnect.Type
  >(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handleMessage = (event: MessageEvent) => {
          Queue.offerUnsafe(
            queue,
            Message.ReceivedMessage({ text: event.data }),
          )
        }
        const handleClose = () => {
          Queue.offerUnsafe(queue, Message.Disconnected())
          Queue.endUnsafe(queue)
        }
        const handleError = () => {
          Queue.offerUnsafe(
            queue,
            Message.FailedConnect({ error: 'Connection error' }),
          )
          Queue.endUnsafe(queue)
        }

        socket.addEventListener('message', handleMessage)
        socket.addEventListener('close', handleClose)
        socket.addEventListener('error', handleError)

        return { handleMessage, handleClose, handleError }
      }),
      ({ handleMessage, handleClose, handleError }) =>
        Effect.sync(() => {
          socket.removeEventListener('message', handleMessage)
          socket.removeEventListener('close', handleClose)
          socket.removeEventListener('error', handleError)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

export const subscriptions = Subscription.make<
  Model,
  Message,
  ChatSocketService
>()(entry => ({
  isConnected: entry(
    { isConnected: S.Boolean },
    {
      modelToDependencies: model => ({
        isConnected: model.connection._tag === 'ConnectionConnected',
      }),
      dependenciesToStream: ({ isConnected }) =>
        Stream.when(
          Stream.unwrap(
            ChatSocket.get.pipe(
              Effect.map(streamChatSocketMessages),
              Effect.catchTag('ResourceNotAvailable', () =>
                Effect.succeed(Stream.empty),
              ),
            ),
          ),
          Effect.sync(() => isConnected),
        ),
    },
  ),
}))

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'WebSocket Chat',
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[600px]',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'p-6 border-b border-gray-200 flex items-center justify-between',
              ),
            ],
            [
              h.div(
                [],
                [
                  h.div(
                    [h.Class('text-2xl font-bold text-gray-800')],
                    ['WebSocket Chat'],
                  ),
                  h.div(
                    [h.Class('text-sm text-gray-500 mt-1')],
                    ['Echo server demo'],
                  ),
                ],
              ),
              connectionStatusView(model.connection, h),
            ],
          ),

          messagesView(model.messages, h),

          M.value(model.connection).pipe(
            M.tagsExhaustive({
              ConnectionDisconnected: () => connectButtonView(h),
              ConnectionConnecting: () => connectingView(h),
              ConnectionConnected: () =>
                messageInputView(model.messageInput, h),
              ConnectionError: ({ error }) => errorView(error, h),
            }),
          ),
        ],
      ),
    ],
  ),
})

const connectionStatusView = (
  connection: ConnectionState,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex items-center gap-2')],
    [
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-red-500')]),
          ConnectionConnecting: () =>
            h.div([
              h.Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse'),
            ]),
          ConnectionConnected: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-green-500')]),
          ConnectionError: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-red-500')]),
        }),
      ),
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () =>
            h.span([h.Class('text-sm text-gray-600')], ['Disconnected']),
          ConnectionConnecting: () =>
            h.span([h.Class('text-sm text-gray-600')], ['Connecting...']),
          ConnectionConnected: () =>
            h.span([h.Class('text-sm text-gray-600')], ['Connected']),
          ConnectionError: () =>
            h.span([h.Class('text-sm text-red-600')], ['Error']),
        }),
      ),
    ],
  )

const messagesView = (
  messages: ReadonlyArray<ChatMessage>,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(messages, {
    onEmpty: () =>
      h.div(
        [
          h.Class(
            'flex-1 p-6 overflow-y-auto flex items-center justify-center',
          ),
        ],
        [
          h.div(
            [h.Class('text-center text-gray-400')],
            [
              h.p([h.Class('text-lg mb-2')], ['No messages yet']),
              h.p([h.Class('text-sm')], ['Send a message to get started!']),
            ],
          ),
        ],
      ),
    onNonEmpty: messages =>
      h.div(
        [h.Class('flex-1 p-6 overflow-y-auto')],
        [
          h.ul(
            [h.Class('space-y-3')],
            messages.map(message => {
              return h.li(
                [
                  h.Class(
                    message.isSent ? 'flex justify-end' : 'flex justify-start',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        message.isSent
                          ? 'bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs'
                          : 'bg-gray-200 text-gray-800 rounded-lg px-4 py-2 max-w-xs',
                      ),
                    ],
                    [
                      h.p([h.Class('break-words')], [message.text]),
                      h.p(
                        [
                          h.Class(
                            message.isSent
                              ? 'text-blue-100 text-xs mt-1'
                              : 'text-gray-500 text-xs mt-1',
                          ),
                        ],
                        [
                          DateTime.format(message.zoned, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
  })

const connectButtonView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [
      Button.view(
        {
          onClick: Message.ClickedConnect(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition',
                ),
              ],
              ['Connect to Chat'],
            ),
        },
        h,
      ),
    ],
  )

const connectingView = (h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [h.div([h.Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )

const messageInputView = (
  messageInput: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.form(
    [
      h.Class('p-6 border-t border-gray-200'),
      h.OnSubmit(Message.SubmittedMessage()),
    ],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          Input.view(
            {
              id: 'message',
              value: messageInput,
              placeholder: 'Type a message...',
              onInput: value => Message.UpdatedMessageInput({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.Class(
                    'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                  ),
                ]),
            },
            h,
          ),
          Button.view(
            {
              type: 'submit',
              isDisabled: String.isEmpty(messageInput.trim()),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'bg-blue-500 hover:bg-blue-600 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition',
                    ),
                  ],
                  ['Send'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )

const errorView = (error: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200')],
    [
      h.div(
        [h.Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4')],
        [
          h.p(
            [h.Class('text-red-800 font-semibold mb-1')],
            ['Connection Error'],
          ),
          h.p([h.Class('text-red-600 text-sm')], [error]),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedConnect(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition',
                ),
              ],
              ['Try Again'],
            ),
        },
        h,
      ),
    ],
  )
