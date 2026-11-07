import { makeOptionalKeyedFieldBinding } from '../block'
import { RoomBlock } from '../blocks'
import * as ApplicationRoute from '../route'

export const MaybeRoomInstanceBinding = makeOptionalKeyedFieldBinding(
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
