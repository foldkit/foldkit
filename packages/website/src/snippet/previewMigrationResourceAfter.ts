import { Array, Effect, RcMap, Schema, Stream } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const CHAT_URL = 'wss://chat.example.com'

const Message = defineMessageUnion({
  ClickedConnect: {},
  ClickedDisconnect: {},
  ClickedSend: { text: Schema.String },
  ReceivedChatMessage: { text: Schema.String },
  SucceededSendMessage: {},
  FailedSendMessage: { error: Schema.String },
})

const SendMessage = Command.define('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendMessage, Message.FailedSendMessage],
})

export class Chat extends Block<Chat>()('Chat', {
  Model: Schema.Struct({
    isConnected: Schema.Boolean,
    receivedMessages: Schema.Array(Schema.String),
  }),
  Message,
  Command: [SendMessage],
}) {}

export const ChatLive = Chat.toLayer(
  Effect.gen(function* () {
    // Opens a socket on first use and closes it when its last holder releases it.
    const sockets = yield* RcMap.make({
      lookup: (url: string) =>
        Effect.acquireRelease(
          Effect.sync(() => new WebSocket(url)),
          socket => Effect.sync(() => socket.close()),
        ),
    })

    return {
      init: () => ({ isConnected: false, receivedMessages: [] }),

      update: {
        ClickedConnect: model => ({
          model: modifyFields(model, { isConnected: () => true }),
        }),
        ClickedDisconnect: model => ({
          model: modifyFields(model, { isConnected: () => false }),
        }),
        ClickedSend: (model, { text }) => ({
          model,
          commands: Array.filter(
            [SendMessage({ text })],
            () => model.isConnected,
          ),
        }),
        ReceivedChatMessage: (model, { text }) => ({
          model: modifyFields(model, { receivedMessages: Array.append(text) }),
        }),
        SucceededSendMessage: model => ({ model }),
        FailedSendMessage: model => ({ model }),
      },

      // The Subscription holds the socket while `isConnected` is true.
      // Ending the Stream releases it, which closes the socket.
      subscriptions: {
        chatSocket: {
          dependencies: model => model.isConnected,
          stream: (isConnected: boolean) =>
            isConnected
              ? Stream.unwrap(
                  Effect.map(RcMap.get(sockets, CHAT_URL), socket =>
                    Stream.fromEventListener<MessageEvent>(
                      socket,
                      'message',
                    ).pipe(
                      Stream.map(event =>
                        Message.ReceivedChatMessage({
                          text: String(event.data),
                        }),
                      ),
                    ),
                  ),
                )
              : Stream.empty,
        },
      },

      commands: {
        // The Command borrows the socket the Subscription holds.
        SendMessage: ({ text }) =>
          RcMap.get(sockets, CHAT_URL).pipe(
            Effect.flatMap(socket => Effect.try(() => socket.send(text))),
            Effect.scoped,
            Effect.as(Message.SucceededSendMessage()),
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
            model.isConnected
              ? h.button(
                  [h.OnClick(Message.ClickedDisconnect())],
                  ['Disconnect'],
                )
              : h.button([h.OnClick(Message.ClickedConnect())], ['Connect']),
            h.button(
              [h.OnClick(Message.ClickedSend({ text: 'Hello' }))],
              ['Say hello'],
            ),
            h.ul(
              [],
              Array.map(model.receivedMessages, text => h.li([], [text])),
            ),
          ],
        ),
    }
  }),
)
