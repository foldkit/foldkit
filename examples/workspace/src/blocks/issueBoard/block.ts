import { Effect } from 'effect'

import { layer as DragAndDropLayer } from '@foldkit/ui/dragAndDrop'

import { DragAndDropBinding } from './composition'
import { IssueBoardDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

const block = IssueBoardDefinition.makeBlock(
  Effect.gen(function* () {
    const dragAndDrop = yield* DragAndDropBinding
    return {
      children: [dragAndDrop],
      init,
      update,
      receive,
      view,
    }
  }),
).provide(DragAndDropLayer)

export const layer = block.layer
