import { Option } from 'effect'
import { initAndSet } from 'foldkit/binding'

import { makeStep } from './block'
import { RoomBinding } from './composition'

const initRoom = (roomId: string) =>
  makeStep(model =>
    initAndSet(RoomBinding, model, {
      key: roomId,
      args: [Option.some(roomId)],
    }),
  )
