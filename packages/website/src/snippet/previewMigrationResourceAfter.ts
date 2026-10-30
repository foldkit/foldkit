import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const CHAT_URL = 'wss://chat.example.com'

// The socket lives exactly as long as a ChatSocket instance is in the Model.
export class ChatSocket extends Block<ChatSocket, void, void, WebSocket>()(
  'ChatSocket',
  {},
) {}

export const ChatSocketLive = ChatSocket.make(
  Effect.fn(function* () {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket(CHAT_URL)),
      socket => Effect.sync(() => socket.close()),
    )

    return { expose: socket }
  }),
)

const Message = defineMessageUnion({
  ClickedConnect: {},
  ClickedDisconnect: {},
  ClickedSend: { text: Schema.String },
  SucceededSendMessage: {},
  FailedSendMessage: { error: Schema.String },
})

const SendMessage = Command.define('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendMessage, Message.FailedSendMessage],
})

export class Chat extends Block<Chat>()('Chat', {
  Model: Schema.Struct({ maybeChatSocket: Schema.Option(ChatSocket) }),
  Message,
  Command: [SendMessage],
}) {}

export const ChatLive = Chat.make(
  Effect.fn(function* () {
    const chatSocket = yield* new ChatSocket('chatSocket')

    return {
      model: { maybeChatSocket: Option.none() },

      update: {
        ClickedConnect: model => ({
          model: modifyFields(model, {
            maybeChatSocket: () => Option.some(chatSocket),
          }),
        }),
        ClickedDisconnect: model => ({
          model: modifyFields(model, { maybeChatSocket: () => Option.none() }),
        }),
        ClickedSend: (model, { text }) => ({
          model,
          commands: [SendMessage({ text })],
        }),
        SucceededSendMessage: model => ({ model }),
        FailedSendMessage: model => ({ model }),
      },

      commands: {
        // `use` fails with NotConnected while the socket is not in the Model.
        SendMessage: ({ text }) =>
          chatSocket.use.pipe(
            Effect.flatMap(socket => Effect.try(() => socket.send(text))),
            Effect.as(Message.SucceededSendMessage()),
            Effect.catchTag('NotConnected', () =>
              Effect.succeed(
                Message.FailedSendMessage({ error: 'Not connected' }),
              ),
            ),
            Effect.catch(() =>
              Effect.succeed(
                Message.FailedSendMessage({ error: 'Send failed' }),
              ),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            Option.isSome(model.maybeChatSocket)
              ? h.button(
                  [h.OnClick(Message.ClickedDisconnect())],
                  ['Disconnect'],
                )
              : h.button([h.OnClick(Message.ClickedConnect())], ['Connect']),
            h.button(
              [h.OnClick(Message.ClickedSend({ text: 'Hello' }))],
              ['Say hello'],
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(ChatSocketLive))
