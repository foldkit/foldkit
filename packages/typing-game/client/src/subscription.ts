import { Subscription } from 'foldkit'

import { GotHomeMessage, GotRoomMessage, Message } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import { RoomsClient } from './rpc'

const homeSubscriptions = Subscription.lift(Home.subscriptions)<Model, Message>(
  {
    toChildModel: model => model.home,
    toParentMessage: message => GotHomeMessage({ message }),
    when: ({ route }) => route._tag === 'Home',
  },
)

const roomSubscriptions = Subscription.lift(Room.subscriptions)({
  toChildModel: (model: Model) => model.room,
  toParentMessage: (message: Room.Message.Message): Message =>
    GotRoomMessage({ message }),
  when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
})

export const subscriptions = Subscription.aggregate<
  Model,
  Message,
  RoomsClient
>()(homeSubscriptions, roomSubscriptions)
