import { Option } from 'effect'
import { initAndSet } from 'foldkit/binding'

import { MaybeRoomInstanceBinding } from './composition/room'
import { type Model } from './model'

export const initRoom = (model: Model, roomId: string) =>
  initAndSet(MaybeRoomInstanceBinding, model, {
    key: roomId,
    args: [Option.some(roomId)],
  })
