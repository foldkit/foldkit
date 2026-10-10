import { Cause, Effect, Option, Schema, Stream } from 'effect'
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
      handler: function* () {
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
      },
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
      handler: function* () {
        return ({ shouldCaptureKeyboard }) =>
          Stream.when(
            capturedKeyDownStream(key => Message.PressedKey({ key })),
            Effect.sync(() => shouldCaptureKeyboard),
          )
      },
    },
  ),
}))
