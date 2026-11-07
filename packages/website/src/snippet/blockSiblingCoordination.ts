import {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} from './block'
import * as Home from './home'
import * as Room from './room'

const BaseHomeBinding = makeRequiredFieldBinding(Home.HomeBlock, {
  field: 'home',
})

const BaseRoomBinding = makeRequiredFieldBinding(Room.RoomBlock, {
  field: 'room',
})

const foldHomeOutMessage = makeOutMessageFold(Home.HomeBlock, {
  SelectedRoom: ({ roomId }) => BaseRoomBinding.requestOpen(roomId),
})

const foldRoomOutMessage = makeOutMessageFold(Room.RoomBlock, {
  SavedRoom: ({ roomId }) => BaseHomeBinding.informOfRoomSaved(roomId),
})

export const HomeBinding = BaseHomeBinding.withOutMessagePolicy({
  fold: foldHomeOutMessage,
})

export const RoomBinding = BaseRoomBinding.withOutMessagePolicy({
  fold: foldRoomOutMessage,
})

export const ApplicationComposition = makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
