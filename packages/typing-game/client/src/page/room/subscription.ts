import { Cause, Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { capturedKeyDownStream } from '../../keyboard'
import { RoomsClient } from '../../rpc'
import { Message } from './message'
import { Model, capturesKeyboard } from './model'

export const subscriptions = Subscription.make<Model, Message, RoomsClient>()(
  entry => ({
    roomStream: entry(
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
        dependenciesToStream: ({ maybeRoomStream }) =>
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
      },
    ),

    roomKeyboard: entry(
      { shouldCaptureKeyboard: Schema.Boolean },
      {
        modelToDependencies: model => ({
          shouldCaptureKeyboard: capturesKeyboard(model),
        }),
        dependenciesToStream: ({ shouldCaptureKeyboard }) =>
          Stream.when(
            capturedKeyDownStream(key => Message.PressedKey({ key })),
            Effect.sync(() => shouldCaptureKeyboard),
          ),
      },
    ),
  }),
)
