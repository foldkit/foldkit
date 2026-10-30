import { Array, DateTime, Effect, Match, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import { ChatSocket } from './chatSocket'

const ChatMessage = Schema.Struct({
  text: Schema.String,
  zoned: Schema.DateTimeZoned,
  isSent: Schema.Boolean,
})
type ChatMessage = typeof ChatMessage.Type

export const ConnectionState = defineTaggedUnion({
  Disconnected: {},
  Connecting: {},
  Connected: {},
  Error: { error: Schema.String },
})
export type ConnectionState = typeof ConnectionState.Type

export const Model = Schema.Struct({
  connection: ConnectionState,
  maybeChatSocket: Schema.Option(ChatSocket),
  messages: Schema.Array(ChatMessage),
  messageInput: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedConnect: {},
  FailedSendMessage: { error: Schema.String },
  UpdatedMessageInput: { value: Schema.String },
  SubmittedMessage: {},
  SucceededSendMessage: { text: Schema.String },
  TimestampedMessage: {
    text: Schema.String,
    zoned: Schema.DateTimeZoned,
    isSent: Schema.Boolean,
  },
})
export type Message = typeof Message.Type

const getZonedTime = DateTime.now.pipe(
  Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())),
)

export const TimestampSentMessage = Command.define('TimestampSentMessage', {
  args: { text: Schema.String },
  messages: [Message.TimestampedMessage],
})

export const TimestampReceivedMessage = Command.define(
  'TimestampReceivedMessage',
  {
    args: { text: Schema.String },
    messages: [Message.TimestampedMessage],
  },
)

export const SendMessage = Command.define('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendMessage, Message.FailedSendMessage],
})

const timestampMessage =
  (isSent: boolean) =>
  ({ text }: Readonly<{ text: string }>) =>
    getZonedTime.pipe(
      Effect.map(zoned => Message.TimestampedMessage({ text, zoned, isSent })),
    )

const sendMessage =
  (chatSocket: ChatSocket) =>
  ({ text }: Readonly<{ text: string }>) =>
    chatSocket.use.pipe(
      Effect.flatMap(socket =>
        Effect.try({
          try: () => {
            socket.send(text)
            return Message.SucceededSendMessage({ text })
          },
          catch: error =>
            error instanceof Error ? error.message : 'Failed to send message',
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(Message.FailedSendMessage({ error })),
          ),
        ),
      ),
      Effect.catchTag('NotConnected', () =>
        Effect.succeed(
          Message.FailedSendMessage({ error: 'Socket unavailable' }),
        ),
      ),
    )

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [TimestampSentMessage, TimestampReceivedMessage, SendMessage],
}) {}

type ApplicationViewBuilder = HtmlBuilder<Message>

const view = (model: Model, h: ApplicationViewBuilder) => ({
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

          ConnectionState.match(model.connection, {
            Disconnected: () => connectButtonView(h),
            Connecting: () => connectingView(h),
            Connected: () => messageInputView(model.messageInput, h),
            Error: ({ error }) => errorView(error, h),
          }),
        ],
      ),
    ],
  ),
})

const connectionStatusView = (
  connection: ConnectionState,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('flex items-center gap-2')],
    [
      ConnectionState.match(connection, {
        Disconnected: () => h.div([h.Class('w-3 h-3 rounded-full bg-red-500')]),
        Connecting: () =>
          h.div([h.Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse')]),
        Connected: () => h.div([h.Class('w-3 h-3 rounded-full bg-green-500')]),
        Error: () => h.div([h.Class('w-3 h-3 rounded-full bg-red-500')]),
      }),
      ConnectionState.match(connection, {
        Disconnected: () =>
          h.span([h.Class('text-sm text-gray-600')], ['Disconnected']),
        Connecting: () =>
          h.span([h.Class('text-sm text-gray-600')], ['Connecting...']),
        Connected: () =>
          h.span([h.Class('text-sm text-gray-600')], ['Connected']),
        Error: () => h.span([h.Class('text-sm text-red-600')], ['Error']),
      }),
    ],
  )

const messagesView = (
  messages: ReadonlyArray<ChatMessage>,
  h: ApplicationViewBuilder,
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

const connectButtonView = (h: ApplicationViewBuilder): Html =>
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

const connectingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [h.div([h.Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )

const messageInputView = (
  messageInput: string,
  h: ApplicationViewBuilder,
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

const errorView = (error: string, h: ApplicationViewBuilder): Html =>
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

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const chatSocket = yield* new ChatSocket('chatSocket')

    return {
      model: {
        connection: ConnectionState.Disconnected(),
        maybeChatSocket: Option.none(),
        messages: [],
        messageInput: '',
      },

      update: {
        ClickedConnect: model => ({
          model: modifyFields(model, {
            connection: () => ConnectionState.Connecting(),
            maybeChatSocket: Option.orElseSome(() => chatSocket),
          }),
        }),

        FailedSendMessage: (model, { error }) => ({
          model: modifyFields(model, {
            connection: () => ConnectionState.Error({ error }),
            maybeChatSocket: () => Option.none(),
          }),
        }),

        UpdatedMessageInput: (model, { value }) => ({
          model: modifyFields(model, { messageInput: () => value }),
        }),

        SubmittedMessage: model => {
          const trimmedMessage = model.messageInput.trim()

          if (String.isEmpty(trimmedMessage)) {
            return { model }
          }

          return Match.value(model.connection).pipe(
            Match.tag('Connected', () => ({
              model: modifyFields(model, { messageInput: () => '' }),
              commands: [SendMessage({ text: trimmedMessage })],
            })),
            Match.orElse(() => ({ model })),
          )
        },

        SucceededSendMessage: (model, { text }) => ({
          model,
          commands: [TimestampSentMessage({ text })],
        }),

        TimestampedMessage: (model, { text, zoned, isSent }) => {
          const nextMessage = ChatMessage.make({ text, zoned, isSent })

          return {
            model: modifyFields(model, {
              messages: messages => [...messages, nextMessage],
            }),
          }
        },

        ...chatSocket.on<Model>({
          Connected: model => ({
            model: modifyFields(model, {
              connection: () => ConnectionState.Connected(),
            }),
          }),
          FailedConnect: (model, { error }) => ({
            model: modifyFields(model, {
              connection: () => ConnectionState.Error({ error }),
              maybeChatSocket: () => Option.none(),
            }),
          }),
          ReceivedMessage: (model, { text }) => ({
            model,
            commands: [TimestampReceivedMessage({ text })],
          }),
          Disconnected: model => ({
            model: modifyFields(model, {
              connection: () => ConnectionState.Disconnected(),
              maybeChatSocket: () => Option.none(),
              messages: () => [],
            }),
          }),
          Failed: (model, { error }) => ({
            model: modifyFields(model, {
              connection: () => ConnectionState.Error({ error }),
              maybeChatSocket: () => Option.none(),
            }),
          }),
        }),
      },

      commands: {
        TimestampSentMessage: timestampMessage(true),
        TimestampReceivedMessage: timestampMessage(false),
        SendMessage: sendMessage(chatSocket),
      },

      view,
    }
  }),
)
