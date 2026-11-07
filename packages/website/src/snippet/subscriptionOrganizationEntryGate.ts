import { makeRequiredFieldBinding } from './block'
import * as Room from './room'

export const RoomBinding = makeRequiredFieldBinding(Room.RoomBlock, {
  field: 'room',
  subscriptions: {
    when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
  },
})
