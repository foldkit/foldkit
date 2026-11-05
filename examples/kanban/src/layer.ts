import { Effect, Layer } from 'effect'

import { DragAndDrop } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { DragAndDropBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const dragAndDrop = yield* DragAndDropBinding

    return {
      children: [dragAndDrop],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(DragAndDrop.layer)))
