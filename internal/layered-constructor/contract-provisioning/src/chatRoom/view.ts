import { Array, DateTime } from 'effect'
import type { Html } from 'foldkit/html'

import {
  ChatRoomComposition,
  type ChatRoomViewBuilder,
  MessageComposerBinding,
} from './composition'
import { Message } from './message'
import { type ChatMessage, ConnectionState } from './model'

const messagesView = (
  messages: ReadonlyArray<ChatMessage>,
  h: ChatRoomViewBuilder,
): Html =>
  Array.match(messages, {
    onEmpty: () => h.p([h.Class('empty')], ['No messages yet']),
    onNonEmpty: messages =>
      h.ol(
        [h.Class('messages'), h.AriaLabel('Messages')],
        Array.map(messages, message =>
          h.keyed('li')(
            message.id,
            [h.Class(message.isSent ? 'sent' : 'received')],
            [
              h.p([], [message.text]),
              h.time(
                [],
                [
                  DateTime.format(message.zoned, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                ],
              ),
            ],
          ),
        ),
      ),
  })

export const view = ChatRoomComposition.makeView((model, h) =>
  h.section(
    [h.Class('room'), h.AriaLabel(model.title)],
    [
      h.header(
        [],
        [
          h.h2([], [model.title]),
          h.p([h.Role('status')], [model.connection._tag]),
        ],
      ),
      h.div([h.Class('conversation')], [messagesView(model.messages, h)]),
      ConnectionState.match(model.connection, {
        Disconnected: () =>
          h.button([h.OnClick(Message.ClickedConnect())], ['Connect']),
        Connecting: () => h.p([], ['Connecting…']),
        Connected: () =>
          h.div(
            [],
            [
              h.block(
                MessageComposerBinding.embedView({
                  slotId: model.messageComposer.id,
                  model: model.messageComposer,
                }),
              ),
              h.button(
                [h.OnClick(Message.RequestedDisconnect())],
                ['Disconnect'],
              ),
            ],
          ),
        Error: ({ error }) =>
          h.div(
            [],
            [
              h.p([h.Role('alert')], [error]),
              h.button([h.OnClick(Message.ClickedConnect())], ['Reconnect']),
            ],
          ),
      }),
    ],
  ),
)
