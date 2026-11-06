import { Effect, Layer } from 'effect'

import { FileDrop } from '@foldkit/ui'

import { AttachmentsBlock } from './block'
import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = AttachmentsBlock.makeLayer(
  Effect.gen(function* () {
    const resumeDrop = yield* ResumeDropBinding
    const additionalFilesDrop = yield* AdditionalFilesDropBinding

    return {
      children: [resumeDrop, additionalFilesDrop],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(FileDrop.layer)))
