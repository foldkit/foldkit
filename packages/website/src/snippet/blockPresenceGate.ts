import { makeRequiredFieldBinding } from './block'
import * as Room from './room'
import { ApplicationRoute } from './route'

const RoomBinding = makeRequiredFieldBinding(Room.RoomBlock, {
  field: 'room',
  activeWhen: model =>
    ApplicationRoute.match(model.route, {
      Home: () => false,
      Room: () => true,
    }),
})
