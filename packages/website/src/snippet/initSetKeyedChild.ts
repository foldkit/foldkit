import { Option } from 'effect'
import { initAndSet } from 'foldkit/bindingInit'

import { RoomBinding } from './composition'
import { makeStep } from './definition'

const initializeRoom = (roomId: string) =>
  makeStep(model =>
    initAndSet(RoomBinding, model, {
      key: roomId,
      args: [Option.some(roomId)],
    }),
  )
