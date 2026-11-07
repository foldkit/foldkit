import { Effect, Layer } from 'effect'

import { FileDrop } from '@foldkit/ui'

import { AttachmentsBlock } from './block'
import { AttachmentsComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = AttachmentsBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* AttachmentsComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(FileDrop.layer)))
