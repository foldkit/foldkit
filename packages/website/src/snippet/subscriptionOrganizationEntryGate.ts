import { ApplicationBlock } from './definition'
import * as Room from './room'

export const RoomBinding = ApplicationBlock.makeBinding(Room.RoomBlock, {
  field: 'room',
  subscriptions: {
    when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
  },
})
