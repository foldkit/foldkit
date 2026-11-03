import { ApplicationDefinition } from './definition'
import * as Home from './home'
import * as Room from './room'

const BaseHomeBinding = ApplicationDefinition.makeBinding(Home.HomeBlock, {
  field: 'home',
})

const BaseRoomBinding = ApplicationDefinition.makeBinding(Room.RoomBlock, {
  field: 'room',
})

const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(
  Home.HomeBlock,
  {
    SelectedRoom: ({ roomId }) => BaseRoomBinding.requestOpen(roomId),
  },
)

const foldRoomOutMessage = ApplicationDefinition.makeOutMessageFold(
  Room.RoomBlock,
  {
    SavedRoom: ({ roomId }) => BaseHomeBinding.informRoomSaved(roomId),
  },
)

export const HomeBinding = BaseHomeBinding.withOutMessagePolicy({
  fold: foldHomeOutMessage,
})

export const RoomBinding = BaseRoomBinding.withOutMessagePolicy({
  fold: foldRoomOutMessage,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
