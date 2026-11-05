import { Effect, Layer } from 'effect'

import { DragAndDrop } from '@foldkit/ui'

import { IssueBoardBlock } from './block'
import { DragAndDropBinding } from './composition'
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
).pipe(Layer.provide(DragAndDrop.layer))
