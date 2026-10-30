import { Array, Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Socket } from './resourceSocket'

const CHAT_URL = 'wss://chat.example.com'

const Message = defineMessageUnion({
  ClickedConnect: {},
  ClickedDisconnect: {},
  ClickedSendHello: {},
  SucceededSendChat: {},
  FailedSendChat: {},
})

export const SendChat = Command.define('SendChat', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendChat, Message.FailedSendChat],
})

export class Chat extends Block<Chat>()('Chat', {
  Model: Schema.Struct({
    lines: Schema.Array(Schema.String),
    maybeSocket: Schema.Option(Socket),
  }),
  Message,
  Command: [SendChat],
}) {}

export const ChatLive = Chat.make(
  Effect.fn(function* () {
    const socket = yield* new Socket('socket', { url: CHAT_URL })

    return {
      model: { lines: [], maybeSocket: Option.none() },

      update: {
        ClickedConnect: model => ({
          model: modifyFields(model, {
            maybeSocket: () => Option.some(socket),
          }),
        }),
        ClickedDisconnect: model => ({
          model: modifyFields(model, { maybeSocket: () => Option.none() }),
        }),
        ClickedSendHello: model => ({
          model,
          commands: [SendChat({ text: 'hello' })],
        }),
        SucceededSendChat: model => ({ model }),
        FailedSendChat: model => ({ model }),

        ...socket.on({
          Received: (model, { data }) => ({
            model: modifyFields(model, { lines: Array.append(data) }),
          }),
        }),
      },

      commands: {
        SendChat: ({ text }) =>
          socket.use.pipe(
            Effect.flatMap(({ send }) => send(text)),
            Effect.as(Message.SucceededSendChat()),
            Effect.catchTag('NotConnected', () =>
              Effect.succeed(Message.FailedSendChat()),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            Option.match(model.maybeSocket, {
              onNone: () =>
                h.button(
                  [h.OnClick(Chat.Message.ClickedConnect())],
                  ['Connect'],
                ),
              onSome: () =>
                h.button(
                  [h.OnClick(Chat.Message.ClickedDisconnect())],
                  ['Disconnect'],
                ),
            }),
            h.button(
              [h.OnClick(Chat.Message.ClickedSendHello())],
              ['Say hello'],
            ),
            h.ul(
              [],
              Array.map(model.lines, line => h.li([], [line])),
            ),
          ],
        ),
    }
  }),
)
