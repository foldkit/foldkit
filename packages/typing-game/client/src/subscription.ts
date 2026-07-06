import { Effect, Match as M, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { GotRoomMessage, Message, PressedKey } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { RoomsClient } from './rpc'

const roomSubscriptions = Subscription.lift(Room.subscriptions)<Model, Message>(
  {
    toChildModel: model => model.room,
    toParentMessage: message => GotRoomMessage({ message }),
  },
)

const keyboardSubscriptions = Subscription.make<Model, Message>()(entry => ({
  keyboard: entry(
    { shouldCaptureKeyboard: S.Boolean },
    {
      modelToDependencies: ({ route, room, home }) => ({
        shouldCaptureKeyboard: M.value(route).pipe(
          M.tagsExhaustive({
            Home: () => Home.Model.capturesKeyboard(home),
            Room: () => Room.Model.capturesKeyboard(room),
            NotFound: () => true,
          }),
        ),
      }),
      dependenciesToStream: ({ shouldCaptureKeyboard }) =>
        Stream.when(
          Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
            Stream.mapEffect(keyboardEvent =>
              Effect.sync(() => {
                keyboardEvent.preventDefault()
                return PressedKey({ key: keyboardEvent.key })
              }),
            ),
          ),
          Effect.sync(() => shouldCaptureKeyboard),
        ),
    },
  ),
}))

export const subscriptions = Subscription.aggregate<
  Model,
  Message,
  RoomsClient
>()(roomSubscriptions, keyboardSubscriptions)
