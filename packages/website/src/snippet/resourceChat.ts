import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Socket } from './resourceSocket'

export class Chat extends Block<Chat>()('Chat', {
  Model: Schema.Struct({
    lines: Schema.Array(Schema.String),
    maybeSocket: Schema.Option(Socket),
  }),
  Message: defineMessageUnion({
    ClickedConnect: {},
    ClickedDisconnect: {},
    ClickedSendHello: {},
  }),
}) {}

export const ChatLive = Chat.toLayer(() => ({
  init: () => ({ lines: [], maybeSocket: Option.none() }),

  update: {
    ClickedConnect: model => ({
      model: modifyFields(model, {
        maybeSocket: () =>
          Option.some(new Socket('socket', { roomId: 'general' })),
      }),
    }),
    ClickedDisconnect: model => ({
      model: modifyFields(model, { maybeSocket: () => Option.none() }),
    }),
    ClickedSendHello: model => ({
      model,
      messages: Option.toArray(
        Option.map(model.maybeSocket, socket =>
          socket.send(Socket.Message.RequestedSend({ data: 'hello' })),
        ),
      ),
    }),

    ...Socket.on({
      Received: (model, { data }) => ({
        model: modifyFields(model, { lines: Array.append(data) }),
      }),
      FailedToSend: (model, { reason }) => ({
        model: modifyFields(model, {
          lines: Array.append(`Not sent: ${reason}`),
        }),
      }),
    }),
  },

  view: (model, h) =>
    h.div(
      [],
      [
        Option.match(model.maybeSocket, {
          onNone: () =>
            h.button([h.OnClick(Chat.Message.ClickedConnect())], ['Connect']),
          onSome: () =>
            h.button(
              [h.OnClick(Chat.Message.ClickedDisconnect())],
              ['Disconnect'],
            ),
        }),
        h.button([h.OnClick(Chat.Message.ClickedSendHello())], ['Say hello']),
        h.ul(
          [],
          Array.map(model.lines, line => h.li([], [line])),
        ),
      ],
    ),
}))
