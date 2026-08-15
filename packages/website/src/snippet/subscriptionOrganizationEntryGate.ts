// subscription.ts
import { Subscription } from 'foldkit'

import { GotRoomMessage, type Message } from './message'
import type { Model } from './model'
import * as Room from './room'

// The Room page holds two Subscriptions: a WebSocket stream that should
// outlive navigation, and a keyboard listener that should not. Naming one
// entry gates it and leaves the other alone.
const roomSubscriptions = Subscription.lift(Room.subscriptions)({
  toChildModel: (model: Model) => model.room,
  toParentMessage: (message: Room.Message): Message =>
    GotRoomMessage({ message }),
  when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  roomSubscriptions,
)
