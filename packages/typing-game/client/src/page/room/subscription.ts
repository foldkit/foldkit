import { Cause, Effect, Layer, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { capturedKeyDownStream } from '../../keyboard'
import { RoomsClient } from '../../rpc'
import { Message } from './message'
import { Model, capturesKeyboard } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  roomUpdates: entry(
    'RoomUpdates',
    {
      maybeRoomStream: Schema.Option(
        Schema.Struct({ roomId: Schema.String, playerId: Schema.String }),
      ),
    },
    {
      messages: [Message.UpdatedRoom, Message.FailedStreamRoom],
      modelToDependencies: model => ({
        maybeRoomStream: Option.map(model.maybeSession, session => ({
          roomId: session.roomId,
          playerId: session.player.id,
        })),
      }),
    },
  ),

  roomKeyPresses: entry(
    'RoomKeyPresses',
    { shouldCaptureKeyboard: Schema.Boolean },
    {
      messages: [Message.PressedKey],
      modelToDependencies: model => ({
        shouldCaptureKeyboard: capturesKeyboard(model),
      }),
    },
  ),
}))

const RoomUpdatesLayer = subscriptions.roomUpdates.toLayer(
  Effect.gen(function* () {
    const client = yield* RoomsClient

    return ({ maybeRoomStream }) =>
      Option.match(maybeRoomStream, {
        onNone: () => Stream.empty,
        onSome: ({ roomId, playerId }) =>
          client.subscribeToRoom({ roomId, playerId }).pipe(
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
          ),
      })
  }),
)

const RoomKeyPressesLayer = subscriptions.roomKeyPresses.toLayer(
  Effect.succeed(({ shouldCaptureKeyboard }) =>
    Stream.when(
      capturedKeyDownStream(key => Message.PressedKey({ key })),
      Effect.sync(() => shouldCaptureKeyboard),
    ),
  ),
)

export const SubscriptionsLayer = Layer.mergeAll(
  RoomUpdatesLayer,
  RoomKeyPressesLayer,
)
