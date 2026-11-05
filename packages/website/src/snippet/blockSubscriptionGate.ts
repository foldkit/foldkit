import { makeBinding } from './block'
import * as Room from './room'

const RoomBinding = makeBinding(Room.RoomBlock, {
  field: 'room',
  subscriptions: {
    when: { roomKeyPresses: model => model.route._tag === 'Room' },
  },
})
