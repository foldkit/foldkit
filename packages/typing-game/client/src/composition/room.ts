import { RoomBlock } from '../blocks'
import { ApplicationBlock } from '../definition'
import * as ApplicationRoute from '../route'

export const MaybeRoomInstanceBinding = ApplicationBlock.makeBinding(
  RoomBlock,
  {
    field: 'maybeRoomInstance',
    key: 'roomId',
    childField: 'model',
    delivery: {
      when: (model, roomId) =>
        ApplicationRoute.isRoomRouteFor(model.route, roomId),
      toUpdateContext: (_model, roomId) => [{ roomId }],
    },
    subscriptions: {
      when: (model, roomId) =>
        ApplicationRoute.isRoomRouteFor(model.route, roomId),
    },
  },
)
