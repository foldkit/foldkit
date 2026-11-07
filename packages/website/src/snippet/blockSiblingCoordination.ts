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

export const HomeBinding = BaseHomeBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(Home.HomeBlock, {
    SelectedRoom: ({ roomId }) => BaseRoomBinding.requestOpen(roomId),
  }),
})

export const RoomBinding = BaseRoomBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(Room.RoomBlock, {
    SavedRoom: ({ roomId }) => BaseHomeBinding.informOfRoomSaved(roomId),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
