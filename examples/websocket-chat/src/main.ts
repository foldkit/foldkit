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
import { Command, ManagedResource, Runtime, Subscription } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

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

export const ClickedConnect = m('ClickedConnect')
export const Connected = m('Connected')
export const Disconnected = m('Disconnected')
export const FailedConnect = m('FailedConnect', { error: S.String })
export const UpdatedMessageInput = m('UpdatedMessageInput', {
  value: S.String,
})
export const SubmittedMessage = m('SubmittedMessage')
export const SucceededSendMessage = m('SucceededSendMessage', {
  text: S.String,
})
export const ReceivedMessage = m('ReceivedMessage', { text: S.String })
export const TimestampedMessage = m('TimestampedMessage', {
  text: S.String,
  zoned: S.DateTimeZoned,
  isSent: S.Boolean,
})

export const Message = S.Union([
  ClickedConnect,
  Connected,
  Disconnected,
  FailedConnect,
  UpdatedMessageInput,
  SubmittedMessage,
  SucceededSendMessage,
  ReceivedMessage,
  TimestampedMessage,
])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, ChatSocketService>>,
] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Command.Command<Message, never, ChatSocketService>>]
    >(),
    M.tagsExhaustive({
      ClickedConnect: () => [
        evo(model, {
          connection: () => ConnectionConnecting(),
        }),
        [],
      ],

      Connected: () => [
        evo(model, {
          connection: () => ConnectionConnected(),
        }),
        [],
      ],

      Disconnected: () => [
        evo(model, {
          connection: () => ConnectionDisconnected(),
          messages: () => [],
        }),
        [],
      ],

      FailedConnect: ({ error }) => [
        evo(model, {
          connection: () => ConnectionError({ error }),
        }),
        [],
      ],

      UpdatedMessageInput: ({ value }) => [
        evo(model, {
          messageInput: () => value,
        }),
        [],
      ],

      SubmittedMessage: () => {
        const trimmedMessage = model.messageInput.trim()

        if (String.isEmpty(trimmedMessage)) {
          return [model, []]
        }

        return M.value(model.connection).pipe(
          M.withReturnType<
            [
              Model,
              ReadonlyArray<Command.Command<Message, never, ChatSocketService>>,
            ]
          >(),
          M.tag('ConnectionConnected', () => [
            evo(model, {
              messageInput: () => '',
            }),
            [SendMessage({ text: trimmedMessage })],
          ]),
          M.orElse(() => [model, []]),
        )
      },

      SucceededSendMessage: ({ text }) => [
        model,
        [TimestampSentMessage({ text })],
      ],

      ReceivedMessage: ({ text }) => [
        model,
        [TimestampReceivedMessage({ text })],
      ],

      TimestampedMessage: ({ text, zoned, isSent }) => {
        const newMessage = ChatMessage.make({ text, zoned, isSent })

        return [
          evo(model, {
            messages: messages => [...messages, newMessage],
          }),
          [],
        ]
      },
    }),
  )

// INIT

export const init: Runtime.ProgramInit<Model, Message> = () => [
  {
    connection: ConnectionDisconnected(),
    messages: [],
    messageInput: '',
  },
  [],
]

// COMMAND

export const TimestampSentMessage = Command.define(
  'TimestampSentMessage',
  { text: S.String },
  TimestampedMessage,
)(({ text }) =>
  getZonedTime.pipe(
    Effect.map(zoned => TimestampedMessage({ text, zoned, isSent: true })),
  ),
)

export const TimestampReceivedMessage = Command.define(
  'TimestampReceivedMessage',
  { text: S.String },
  TimestampedMessage,
)(({ text }) =>
  getZonedTime.pipe(
    Effect.map(zoned => TimestampedMessage({ text, zoned, isSent: false })),
  ),
)

export const SendMessage = Command.define(
  'SendMessage',
  { text: S.String },
  SucceededSendMessage,
  FailedConnect,
)(({ text }) =>
  ChatSocket.get.pipe(
    Effect.flatMap(socket =>
      Effect.sync(() => {
        socket.send(text)
        return SucceededSendMessage({ text })
      }),
    ),
    Effect.catchTag('ResourceNotAvailable', () =>
      Effect.succeed(FailedConnect({ error: 'Socket unavailable' })),
    ),
  ),
)

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
      onAcquired: () => Connected(),
      onReleased: () => Disconnected(),
      onAcquireError: error =>
        FailedConnect({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
    }),
  }),
)

// SUBSCRIPTION

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
              Effect.map(socket =>
                Stream.callback<
                  | typeof ReceivedMessage.Type
                  | typeof Disconnected.Type
                  | typeof FailedConnect.Type
                >(queue =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      const handleMessage = (event: MessageEvent) => {
                        Queue.offerUnsafe(
                          queue,
                          ReceivedMessage({ text: event.data }),
                        )
                      }
                      const handleClose = () => {
                        Queue.offerUnsafe(queue, Disconnected())
                        Queue.endUnsafe(queue)
                      }
                      const handleError = () => {
                        Queue.offerUnsafe(
                          queue,
                          FailedConnect({ error: 'Connection error' }),
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
                ),
              ),
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

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
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
                connectionStatusView(model.connection),
              ],
            ),

            messagesView(model.messages),

            M.value(model.connection).pipe(
              M.tagsExhaustive({
                ConnectionDisconnected: connectButtonView,
                ConnectionConnecting: connectingView,
                ConnectionConnected: () => messageInputView(model.messageInput),
                ConnectionError: ({ error }) => errorView(error),
              }),
            ),
          ],
        ),
      ],
    ),
  }
}

const connectionStatusView = (connection: ConnectionState): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex items-center gap-2')],
    [
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-red-500')], []),
          ConnectionConnecting: () =>
            h.div(
              [h.Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse')],
              [],
            ),
          ConnectionConnected: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-green-500')], []),
          ConnectionError: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-red-500')], []),
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
}

const messagesView = (messages: ReadonlyArray<ChatMessage>): Html => {
  const h = html<Message>()

  return Array.match(messages, {
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
}

const connectButtonView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [
      h.button(
        [
          h.OnClick(ClickedConnect()),
          h.Class(
            'bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition',
          ),
        ],
        ['Connect to Chat'],
      ),
    ],
  )
}

const connectingView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [h.div([h.Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )
}

const messageInputView = (messageInput: string): Html => {
  const h = html<Message>()

  return h.form(
    [h.Class('p-6 border-t border-gray-200'), h.OnSubmit(SubmittedMessage())],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          h.input([
            h.Type('text'),
            h.Value(messageInput),
            h.Placeholder('Type a message...'),
            h.OnInput(value => UpdatedMessageInput({ value })),
            h.Class(
              'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
          ]),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(String.isEmpty(messageInput.trim())),
              h.Class(
                'bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition',
              ),
            ],
            ['Send'],
          ),
        ],
      ),
    ],
  )
}

const errorView = (error: string): Html => {
  const h = html<Message>()

  return h.div(
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
      h.button(
        [
          h.OnClick(ClickedConnect()),
          h.Class(
            'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition',
          ),
        ],
        ['Try Again'],
      ),
    ],
  )
}
