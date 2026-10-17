import { Array, DateTime, String } from 'effect'
import { Html } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
} from './composition'
import { Message } from './message'
import { type ChatMessage, ConnectionState } from './model'

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))

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
