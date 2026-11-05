import { makeBinding } from './block'
import * as Room from './room'

export const RoomBinding = makeBinding(Room.RoomBlock, {
  field: 'room',
  subscriptions: {
    when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
  },
})
