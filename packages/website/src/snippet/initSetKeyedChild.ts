import { Option } from 'effect'
import { initAndSet } from 'foldkit/bindingInit'

import { RoomBinding } from './composition'
import { ApplicationDefinition } from './definition'

const initializeRoom = (roomId: string) =>
  ApplicationDefinition.makeStep(model =>
    initAndSet(RoomBinding, model, {
      key: roomId,
      args: [Option.some(roomId)],
    }),
  )
