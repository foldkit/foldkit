import { ApplicationBlock } from './definition'
import * as Room from './room'
import { ApplicationRoute } from './route'

const RoomBinding = ApplicationBlock.makeBinding(Room.RoomBlock, {
  field: 'room',
  presentWhen: model =>
    ApplicationRoute.match(model.route, {
      Home: () => false,
      Room: () => true,
    }),
})
