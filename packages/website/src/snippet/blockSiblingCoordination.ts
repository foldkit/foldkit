import { Application } from './definition'
import * as Home from './home'
import { Message } from './message'
import * as Room from './room'

const foldHomeOutMessage = (outMessage: Home.OutMessage) =>
  Home.OutMessage.match(outMessage, {
    SelectedRoom: ({ roomId }) => RoomBinding.open(roomId),
  })

export const HomeBinding = Application.bindChild(Home.block, {
  field: 'home',
  parentMessage: Message.GotHomeMessage,
  outMessage: { fold: foldHomeOutMessage },
})

const foldRoomOutMessage = (outMessage: Room.OutMessage) =>
  Room.OutMessage.match(outMessage, {
    SavedRoom: ({ roomId }) => HomeBinding.markRoomSaved(roomId),
  })

export const RoomBinding = Application.bindChild(Room.block, {
  field: 'room',
  parentMessage: Message.GotRoomMessage,
  outMessage: { fold: foldRoomOutMessage },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding, RoomBinding],
})
