import { Effect, Layer } from 'effect'

import { layer as DragAndDropLayer } from '@foldkit/ui/dragAndDrop'

import { DragAndDropBinding } from './composition'
import { IssueBoardBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueBoardBlock.makeLayer(
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
).pipe(Layer.provide(DragAndDropLayer))

export { IssueBoardBlock } from './definition'
