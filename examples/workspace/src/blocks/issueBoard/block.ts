import { Effect } from 'effect'

import { layer as DragAndDropLayer } from '@foldkit/ui/dragAndDrop'

import { DragAndDropBinding } from './composition'
import { IssueBoardDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const block = IssueBoardDefinition.makeBlock(
  Effect.gen(function* () {
    const dragAndDrop = yield* DragAndDropBinding

    return {
      children: [dragAndDrop],
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).provide(DragAndDropLayer)

export const layer = block.layer
