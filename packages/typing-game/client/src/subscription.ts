import { Effect, Match as M, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { GotHomeMessage, GotRoomMessage, Message, NoOp } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { AppRoute } from './route'
import { RoomsClient } from './rpc'

const SubscriptionDeps = S.Struct({
  roomSubscription: S.Option(S.Struct({ roomId: S.String, playerId: S.String })),
  keyboard: S.Struct({
    shouldCaptureKeyboard: S.Boolean,
    route: AppRoute,
  }),
})

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<Model, Message>({
  roomSubscription: {
    modelToDependencies: (model: Model) =>
      M.value(model.route).pipe(
        M.tag('Room', ({ roomId }) =>
          Option.map(model.room.maybeSession, session => ({
            roomId,
            playerId: session.player.id,
          })),
        ),
        M.orElse(() => Option.none()),
      ),
    depsToStream: (maybeRoomSubscription: Option.Option<{ roomId: string; playerId: string }>) =>
      Option.match(maybeRoomSubscription, {
        onNone: () => Stream.empty,
        onSome: ({ roomId, playerId }) =>
          Effect.gen(function* () {
            const client = yield* RoomsClient
            return client.subscribeToRoom({ roomId, playerId }).pipe(
              Stream.map(({ room, maybePlayerProgress }) =>
                Effect.succeed(
                  GotRoomMessage({
                    message: Room.Message.UpdatedRoom({ room, maybePlayerProgress }),
                  }),
                ),
              ),
              Stream.catchAll(error =>
                Stream.make(
                  Effect.succeed(
                    GotRoomMessage({
                      message: Room.Message.FailedRoomStream({ error: String(error) }),
                    }),
                  ),
                ),
              ),
            )
          }).pipe(Stream.unwrap, Stream.provideLayer(RoomsClient.Default)),
      }),
  },

  keyboard: {
    modelToDependencies: ({ route, room, home }: Model) => {
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
                  ({ data }) => data.status._tag === 'Waiting' || data.status._tag === 'Finished',
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
    depsToStream: (deps: { shouldCaptureKeyboard: boolean; route: AppRoute }) =>
      Stream.when(
        Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
          Stream.map(keyboardEvent =>
            Effect.sync(() => {
              keyboardEvent.preventDefault()
              const { key } = keyboardEvent

              return M.value(deps.route).pipe(
                M.tagsExhaustive({
                  Home: () => GotHomeMessage({ message: Home.Message.PressedKey({ key }) }),
                  Room: () => GotRoomMessage({ message: Room.Message.PressedKey({ key }) }),
                  NotFound: () => NoOp(),
                }),
              )
            }),
          ),
        ),
        () => deps.shouldCaptureKeyboard,
      ),
  },
})
