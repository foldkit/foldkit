import {
  Context,
  Duration,
  Effect,
  Layer,
  Match,
  RcMap,
  Schema,
  Stream,
} from 'effect'
import { Socket } from 'effect/socket'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const OPEN_TIMEOUT = Duration.seconds(5)

export const SocketState = defineTaggedUnion({
  Opening: {},
  Open: {},
})
export type SocketState = typeof SocketState.Type

const Model = Schema.Struct({
  socketKey: Schema.String,
  state: SocketState,
})

const Message = defineMessageUnion({
  OpenedSocket: {},
  FailedOpenSocket: { error: Schema.String },
  ReceivedSocketMessage: { text: Schema.String },
  ClosedSocket: {},
  ErroredSocket: { error: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  Connected: {},
  FailedConnect: { error: Schema.String },
  ReceivedMessage: { text: Schema.String },
  Disconnected: {},
  Failed: { error: Schema.String },
})

export class ChatSockets extends Context.Service<
  ChatSockets,
  RcMap.RcMap<string, Socket.Socket>
>()('ChatSockets') {}

export const ChatSocketsLive = Layer.effect(
  ChatSockets,
  RcMap.make({
    lookup: (_socketKey: string) =>
      Socket.makeWebSocket(WS_URL, { openTimeout: OPEN_TIMEOUT }),
  }),
)

export class ChatSocket extends Block<ChatSocket>()('ChatSocket', {
  Model,
  Message,
  OutMessage,
}) {}

export const ChatSocketLive = ChatSocket.toLayer(
  Effect.gen(function* () {
    const sockets = yield* ChatSockets

    return {
      init: (_, { id }) => ({ socketKey: id, state: SocketState.Opening() }),

      update: {
        OpenedSocket: model => ({
          model: modifyFields(model, { state: () => SocketState.Open() }),
          outMessage: ChatSocket.OutMessage.Connected(),
        }),
        FailedOpenSocket: (model, { error }) => ({
          model,
          outMessage: ChatSocket.OutMessage.FailedConnect({ error }),
        }),
        ReceivedSocketMessage: (model, { text }) => ({
          model,
          outMessage: ChatSocket.OutMessage.ReceivedMessage({ text }),
        }),
        ClosedSocket: model => ({
          model,
          outMessage: ChatSocket.OutMessage.Disconnected(),
        }),
        ErroredSocket: (model, { error }) => ({
          model,
          outMessage: ChatSocket.OutMessage.Failed({ error }),
        }),
      },

      subscriptions: {
        socket: {
          dependencies: model => model.socketKey,
          stream: (socketKey: string) =>
            Stream.unwrap(
              Effect.gen(function* () {
                const socket = yield* RcMap.get(sockets, socketKey)
                const pull = yield* Socket.readerString(socket)

                return Stream.succeed(Message.OpenedSocket()).pipe(
                  Stream.concat(
                    Stream.forever(Stream.fromEffect(pull)).pipe(
                      Stream.flattenArray,
                      Stream.map(text =>
                        Message.ReceivedSocketMessage({ text }),
                      ),
                    ),
                  ),
                )
              }),
            ).pipe(Stream.catch(error => Stream.succeed(toMessage(error)))),
        },
      },
    }
  }),
)

const toMessage = (error: Socket.SocketError): Message =>
  Match.value(error.reason).pipe(
    Match.tagsExhaustive({
      SocketOpenError: () => Message.FailedOpenSocket({ error: error.message }),
      SocketCloseError: () => Message.ClosedSocket(),
      SocketReadError: () => Message.ErroredSocket({ error: error.message }),
      SocketWriteError: () => Message.ErroredSocket({ error: error.message }),
      SocketUpgradeError: () => Message.ErroredSocket({ error: error.message }),
    }),
  )
