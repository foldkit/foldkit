import {
  Array,
  DateTime,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  Stream,
  String,
} from 'effect'
import { ManagedResource, Runtime, Subscription, Task } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

// MODEL

const ChatMessage = S.Struct({
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
  isSent: S.Boolean,
})

type ChatMessage = typeof ChatMessage.Type

const ChatSocket = ManagedResource.tag<WebSocket>()('ChatSocket')
type ChatSocketService = ManagedResource.ServiceOf<typeof ChatSocket>

const ConnectionDisconnected = ts('ConnectionDisconnected')
const ConnectionConnecting = ts('ConnectionConnecting')
const ConnectionConnected = ts('ConnectionConnected')
const ConnectionError = ts('ConnectionError', { error: S.String })

const ConnectionState = S.Union(
  ConnectionDisconnected,
  ConnectionConnecting,
  ConnectionConnected,
  ConnectionError,
)
type ConnectionState = typeof ConnectionState.Type

const Model = S.Struct({
  connection: ConnectionState,
  messages: S.Array(ChatMessage),
  messageInput: S.String,
})

type Model = typeof Model.Type

// MESSAGE

const RequestedConnection = m('RequestedConnection')
const Connected = m('Connected')
const Disconnected = m('Disconnected')
const FailedConnection = m('FailedConnection', { error: S.String })
const UpdatedMessageInput = m('UpdatedMessageInput', { value: S.String })
const RequestedMessageSend = m('RequestedMessageSend')
const SentMessage = m('SentMessage', { text: S.String })
const ReceivedMessage = m('ReceivedMessage', { text: S.String })
const GotReceivedMessageTime = m('GotReceivedMessageTime', {
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
})
const GotSentMessageTime = m('GotSentMessageTime', {
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
})

const Message = S.Union(
  RequestedConnection,
  Connected,
  Disconnected,
  FailedConnection,
  UpdatedMessageInput,
  RequestedMessageSend,
  SentMessage,
  ReceivedMessage,
  GotReceivedMessageTime,
  GotSentMessageTime,
)
type Message = typeof Message.Type

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message, never, ChatSocketService>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Command<Message, never, ChatSocketService>>]
    >(),
    M.tagsExhaustive({
      RequestedConnection: () => [
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

      FailedConnection: ({ error }) => [
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

      RequestedMessageSend: () => {
        const trimmedMessage = model.messageInput.trim()

        if (String.isEmpty(trimmedMessage)) {
          return [model, []]
        }

        return M.value(model.connection).pipe(
          M.withReturnType<
            [Model, ReadonlyArray<Command<Message, never, ChatSocketService>>]
          >(),
          M.tag('ConnectionConnected', () => [
            evo(model, {
              messageInput: () => '',
            }),
            [sendMessage(trimmedMessage)],
          ]),
          M.orElse(() => [model, []]),
        )
      },

      SentMessage: ({ text }) => [
        model,
        [
          Task.getZonedTime.pipe(
            Effect.map(zoned => GotSentMessageTime({ text, zoned })),
          ),
        ],
      ],

      GotSentMessageTime: ({ text, zoned }) => {
        const newMessage = ChatMessage.make({
          text,
          zoned,
          isSent: true,
        })

        return [
          evo(model, {
            messages: messages => [...messages, newMessage],
          }),
          [],
        ]
      },

      ReceivedMessage: ({ text }) => [
        model,
        [
          Task.getZonedTime.pipe(
            Effect.map(zoned => GotReceivedMessageTime({ text, zoned })),
          ),
        ],
      ],

      GotReceivedMessageTime: ({ text, zoned }) => {
        const newMessage = ChatMessage.make({
          text,
          zoned,
          isSent: false,
        })

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

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    connection: ConnectionDisconnected(),
    messages: [],
    messageInput: '',
  },
  [],
]

// COMMAND

const sendMessage = (
  text: string,
): Command<
  typeof SentMessage | typeof FailedConnection,
  never,
  ChatSocketService
> =>
  ChatSocket.get.pipe(
    Effect.flatMap(socket =>
      Effect.sync(() => {
        socket.send(text)
        return SentMessage({ text })
      }),
    ),
    Effect.catchTag('ResourceNotAvailable', () =>
      Effect.succeed(FailedConnection({ error: 'Socket unavailable' })),
    ),
  )

// MANAGED RESOURCE

const ManagedResourceDeps = S.Struct({
  chatSocket: S.Option(S.Null),
})

const managedResources = ManagedResource.makeManagedResources(
  ManagedResourceDeps,
)<Model, Message>({
  chatSocket: {
    resource: ChatSocket,
    modelToMaybeRequirements: model =>
      M.value(model.connection).pipe(
        M.tag('ConnectionConnecting', () => Option.some(null)),
        M.tag('ConnectionConnected', () => Option.some(null)),
        M.orElse(() => Option.none()),
      ),
    acquire: () =>
      Effect.async<WebSocket, Error>(resume => {
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
        Effect.timeoutFail({
          duration: Duration.millis(CONNECTION_TIMEOUT_MS),
          onTimeout: () => new Error('Connection timeout'),
        }),
      ),
    release: socket =>
      Effect.sync(() => {
        socket.close()
      }),
    onAcquired: () => Connected(),
    onReleased: () => Disconnected(),
    onAcquireError: error =>
      FailedConnection({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
  },
})

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  isConnected: S.Boolean,
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message,
  ChatSocketService
>({
  isConnected: {
    modelToDependencies: model =>
      model.connection._tag === 'ConnectionConnected',
    depsToStream: isConnected => {
      if (!isConnected) {
        return Stream.empty
      }

      return Stream.unwrap(
        ChatSocket.get.pipe(
          Effect.map(socket =>
            Stream.async<
              Command<
                | typeof ReceivedMessage
                | typeof Disconnected
                | typeof FailedConnection
              >
            >(emit => {
              const handleMessage = (event: MessageEvent) => {
                emit.single(
                  Effect.succeed(ReceivedMessage({ text: event.data })),
                )
              }

              const handleClose = () => {
                emit.single(Effect.succeed(Disconnected()))
                emit.end()
              }

              const handleError = () => {
                emit.single(
                  Effect.succeed(
                    FailedConnection({ error: 'Connection error' }),
                  ),
                )
                emit.end()
              }

              socket.addEventListener('message', handleMessage)
              socket.addEventListener('close', handleClose)
              socket.addEventListener('error', handleError)

              return Effect.sync(() => {
                socket.removeEventListener('message', handleMessage)
                socket.removeEventListener('close', handleClose)
                socket.removeEventListener('error', handleError)
              })
            }),
          ),
          Effect.catchTag('ResourceNotAvailable', () =>
            Effect.succeed(Stream.empty),
          ),
        ),
      )
    },
  },
})

// VIEW

const {
  button,
  div,
  form,
  input,
  li,
  p,
  span,
  ul,
  Class,
  Disabled,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
} = html<Message>()

const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6',
      ),
    ],
    [
      div(
        [
          Class(
            'bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[600px]',
          ),
        ],
        [
          div(
            [
              Class(
                'p-6 border-b border-gray-200 flex items-center justify-between',
              ),
            ],
            [
              div(
                [],
                [
                  div(
                    [Class('text-2xl font-bold text-gray-800')],
                    ['WebSocket Chat'],
                  ),
                  div(
                    [Class('text-sm text-gray-500 mt-1')],
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
  )

const connectionStatusView = (connection: ConnectionState): Html =>
  div(
    [Class('flex items-center gap-2')],
    [
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () =>
            div([Class('w-3 h-3 rounded-full bg-red-500')], []),
          ConnectionConnecting: () =>
            div(
              [Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse')],
              [],
            ),
          ConnectionConnected: () =>
            div([Class('w-3 h-3 rounded-full bg-green-500')], []),
          ConnectionError: () =>
            div([Class('w-3 h-3 rounded-full bg-red-500')], []),
        }),
      ),
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () =>
            span([Class('text-sm text-gray-600')], ['Disconnected']),
          ConnectionConnecting: () =>
            span([Class('text-sm text-gray-600')], ['Connecting...']),
          ConnectionConnected: () =>
            span([Class('text-sm text-gray-600')], ['Connected']),
          ConnectionError: () =>
            span([Class('text-sm text-red-600')], ['Error']),
        }),
      ),
    ],
  )

const messagesView = (messages: ReadonlyArray<ChatMessage>): Html =>
  Array.match(messages, {
    onEmpty: () =>
      div(
        [Class('flex-1 p-6 overflow-y-auto flex items-center justify-center')],
        [
          div(
            [Class('text-center text-gray-400')],
            [
              p([Class('text-lg mb-2')], ['No messages yet']),
              p([Class('text-sm')], ['Send a message to get started!']),
            ],
          ),
        ],
      ),
    onNonEmpty: messages =>
      div(
        [Class('flex-1 p-6 overflow-y-auto')],
        [
          ul(
            [Class('space-y-3')],
            messages.map(message => {
              return li(
                [
                  Class(
                    message.isSent ? 'flex justify-end' : 'flex justify-start',
                  ),
                ],
                [
                  div(
                    [
                      Class(
                        message.isSent
                          ? 'bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs'
                          : 'bg-gray-200 text-gray-800 rounded-lg px-4 py-2 max-w-xs',
                      ),
                    ],
                    [
                      p([Class('break-words')], [message.text]),
                      p(
                        [
                          Class(
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

const connectButtonView = (): Html =>
  div(
    [Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [
      button(
        [
          OnClick(RequestedConnection()),
          Class(
            'bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition',
          ),
        ],
        ['Connect to Chat'],
      ),
    ],
  )

const connectingView = (): Html =>
  div(
    [Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [div([Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )

const messageInputView = (messageInput: string): Html =>
  form(
    [Class('p-6 border-t border-gray-200'), OnSubmit(RequestedMessageSend())],
    [
      div(
        [Class('flex gap-3')],
        [
          input([
            Type('text'),
            Value(messageInput),
            Placeholder('Type a message...'),
            OnInput(value => UpdatedMessageInput({ value })),
            Class(
              'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
          ]),
          button(
            [
              Type('submit'),
              Disabled(String.isEmpty(messageInput.trim())),
              Class(
                'bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition',
              ),
            ],
            ['Send'],
          ),
        ],
      ),
    ],
  )

const errorView = (error: string): Html =>
  div(
    [Class('p-6 border-t border-gray-200')],
    [
      div(
        [Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4')],
        [
          p([Class('text-red-800 font-semibold mb-1')], ['Connection Error']),
          p([Class('text-red-600 text-sm')], [error]),
        ],
      ),
      button(
        [
          OnClick(RequestedConnection()),
          Class(
            'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition',
          ),
        ],
        ['Try Again'],
      ),
    ],
  )

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  subscriptions,
  managedResources,
  container: document.getElementById('root')!,
})

Runtime.run(element)
