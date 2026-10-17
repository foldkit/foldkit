import { Application } from './definition'
import { Message } from './message'
import { Model } from './model'
import * as Room from './room'

const RoomBinding = Application.bindChild(Room.block, {
  field: 'room',
  parentMessage: Message.GotRoomMessage,
  subscriptions: {
    when: { roomKeyPresses: model => model.route._tag === 'Room' },
  },
})
