import { ApplicationDefinition } from './definition'
import * as Home from './home'
import * as Room from './room'

const homeBinding = ApplicationDefinition.makeBinding(Home.HomeBlock, {
  field: 'home',
})

const roomBinding = ApplicationDefinition.makeBinding(Room.RoomBlock, {
  field: 'room',
})

const foldHomeOutMessage = ApplicationDefinition.makeOutMessageFold(
  Home.HomeBlock,
  {
    SelectedRoom: ({ roomId }) => roomBinding.requestOpen(roomId),
  },
)

const foldRoomOutMessage = ApplicationDefinition.makeOutMessageFold(
  Room.RoomBlock,
  {
    SavedRoom: ({ roomId }) => homeBinding.informRoomSaved(roomId),
  },
)

export const HomeBinding = homeBinding.withOutMessagePolicy({
  fold: foldHomeOutMessage,
})

export const RoomBinding = roomBinding.withOutMessagePolicy({
  fold: foldRoomOutMessage,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
