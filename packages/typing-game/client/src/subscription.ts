import { Cause, Effect, Match as M, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import {
  GotHomeMessage,
  GotRoomMessage,
  IgnoredKeyPress,
  Message,
} from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { AppRoute } from './route'
import { RoomsClient, RoomsClientLive } from './rpc.js'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  roomSubscription: entry(
    {
      maybeRoomSubscription: S.Option(
        S.Struct({ roomId: S.String, playerId: S.String }),
      ),
    },
    {
      modelToDependencies: model => ({
        maybeRoomSubscription: M.value(model.route).pipe(
          M.tag('Room', ({ roomId }) =>
            Option.map(model.room.maybeSession, session => ({
              roomId,
              playerId: session.player.id,
            })),
          ),
          M.orElse(() => Option.none()),
        ),
      }),
      dependenciesToStream: ({ maybeRoomSubscription }) =>
        Option.match(maybeRoomSubscription, {
          onNone: () => Stream.empty,
          onSome: ({ roomId, playerId }) =>
            Effect.gen(function* () {
              const client = yield* RoomsClient
              return client.subscribeToRoom({ roomId, playerId }).pipe(
                Stream.map(({ room, maybePlayerProgress }) =>
                  GotRoomMessage({
                    message: Room.Message.UpdatedRoom({
                      room,
                      maybePlayerProgress,
                    }),
                  }),
                ),
                Stream.catchCause(cause =>
                  Stream.make(
                    GotRoomMessage({
                      message: Room.Message.FailedStreamRoom({
                        error: Option.match(Cause.findErrorOption(cause), {
                          onSome: failure => String(failure),
                          onNone: () => 'Unknown stream error',
                        }),
                      }),
                    }),
                  ),
                ),
              )
            }).pipe(Stream.unwrap, Stream.provide(RoomsClientLive)),
        }),
    },
  ),

  keyboard: entry(
    {
      shouldCaptureKeyboard: S.Boolean,
      route: AppRoute,
    },
    {
      modelToDependencies: ({ route, room, home }) => {
        const shouldCaptureKeyboard = M.value(route).pipe(
          M.tagsExhaustive({
            Home: () => home.homeStep._tag === 'SelectAction',
            Room: () => {
              const hasSession = Option.isSome(room.maybeSession)
              return (
                hasSession &&
                M.value(room.roomRemoteData).pipe(
                  M.tag(
                    'Ok',
                    ({ data }) =>
                      data.status._tag === 'Waiting' ||
                      data.status._tag === 'Finished',
                  ),
                  M.orElse(() => false),
                )
              )
            },
            NotFound: () => true,
          }),
        )

        return { shouldCaptureKeyboard, route }
      },
      dependenciesToStream: ({ shouldCaptureKeyboard, route }) =>
        Stream.when(
          Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
            Stream.mapEffect(keyboardEvent =>
              Effect.sync(() => {
                keyboardEvent.preventDefault()
                const { key } = keyboardEvent

                return M.value(route).pipe(
                  M.tagsExhaustive({
                    Home: () =>
                      GotHomeMessage({
                        message: Home.Message.PressedKey({ key }),
                      }),
                    Room: () =>
                      GotRoomMessage({
                        message: Room.Message.PressedKey({ key }),
                      }),
                    NotFound: () => IgnoredKeyPress(),
                  }),
                )
              }),
            ),
          ),
          Effect.sync(() => shouldCaptureKeyboard),
        ),
    },
  ),
}))
