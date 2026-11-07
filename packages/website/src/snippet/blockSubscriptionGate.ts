import { makeRequiredFieldBinding } from './block'
import * as Room from './room'

const RoomBinding = makeRequiredFieldBinding(Room.RoomBlock, {
  field: 'room',
  subscriptions: {
    when: { roomKeyPresses: model => model.route._tag === 'Room' },
  },
})
