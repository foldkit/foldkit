import { ApplicationBlock } from './definition'
import * as Home from './home'
import * as Room from './room'

const BaseHomeBinding = ApplicationBlock.makeBinding(Home.HomeBlock, {
  field: 'home',
})

const BaseRoomBinding = ApplicationBlock.makeBinding(Room.RoomBlock, {
  field: 'room',
})

const foldHomeOutMessage = ApplicationBlock.makeOutMessageFold(Home.HomeBlock, {
  SelectedRoom: ({ roomId }) => BaseRoomBinding.requestOpen(roomId),
})

const foldRoomOutMessage = ApplicationBlock.makeOutMessageFold(Room.RoomBlock, {
  SavedRoom: ({ roomId }) => BaseHomeBinding.informRoomSaved(roomId),
})

export const HomeBinding = BaseHomeBinding.withOutMessagePolicy({
  fold: foldHomeOutMessage,
})

export const RoomBinding = BaseRoomBinding.withOutMessagePolicy({
  fold: foldRoomOutMessage,
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
