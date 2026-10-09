import { Cause, Effect, Layer, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { capturedKeyDownStream } from '../../keyboard'
import { RoomsClient } from '../../rpc'
import { Message } from './message'
import { Model, capturesKeyboard } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  roomStream: entry(
    'RoomUpdates',
    {
      maybeRoomStream: Schema.Option(
        Schema.Struct({ roomId: Schema.String, playerId: Schema.String }),
      ),
    },
    {
      modelToDependencies: model => ({
        maybeRoomStream: Option.map(model.maybeSession, session => ({
          roomId: session.roomId,
          playerId: session.player.id,
        })),
      }),
    },
  ),

  roomKeyboard: entry(
    'RoomKeyPresses',
    { shouldCaptureKeyboard: Schema.Boolean },
    {
      modelToDependencies: model => ({
        shouldCaptureKeyboard: capturesKeyboard(model),
      }),
    },
  ),
}))

const RoomUpdatesLive = subscriptions.roomStream.toLayer(
  ({ maybeRoomStream }) =>
    Option.match(maybeRoomStream, {
      onNone: () => Stream.empty,
      onSome: ({ roomId, playerId }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          return client.subscribeToRoom({ roomId, playerId }).pipe(
            Stream.map(({ room, maybePlayerProgress }) =>
              Message.UpdatedRoom({ room, maybePlayerProgress }),
            ),
            Stream.catchCause(cause =>
              Stream.make(
                Message.FailedStreamRoom({
                  error: Option.match(Cause.findErrorOption(cause), {
                    onSome: failure => String(failure),
                    onNone: () => 'Unknown stream error',
                  }),
                }),
              ),
            ),
          )
        }).pipe(Stream.unwrap),
    }),
)

const RoomKeyPressesLive = subscriptions.roomKeyboard.toLayer(
  ({ shouldCaptureKeyboard }) =>
    Stream.when(
      capturedKeyDownStream(key => Message.PressedKey({ key })),
      Effect.sync(() => shouldCaptureKeyboard),
    ),
)

export const SubscriptionsLive = Layer.mergeAll(
  RoomUpdatesLive,
  RoomKeyPressesLive,
)
