import { Application } from './definition'
import { Message } from './message'
import * as Room from './room'
import { ApplicationRoute } from './route'

const RoomBinding = Application.bindChild(Room.block, {
  field: 'room',
  presentWhen: model =>
    ApplicationRoute.match(model.route, {
      Home: () => false,
      Room: () => true,
    }),
  parentMessage: Message.GotRoomMessage,
})
