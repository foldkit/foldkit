import { Cause, Effect, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { FailedStreamRoom, Message, UpdatedRoom } from './message'
import { Model } from './model'

export const subscriptions = Subscription.make<Model, Message, RoomsClient>()(
  entry => ({
    roomStream: entry(
      {
        maybeRoomStream: S.Option(
          S.Struct({ roomId: S.String, playerId: S.String }),
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
                    UpdatedRoom({ room, maybePlayerProgress }),
                  ),
                  Stream.catchCause(cause =>
                    Stream.make(
                      FailedStreamRoom({
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
  }),
)
