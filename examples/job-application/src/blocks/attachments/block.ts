import { Effect, Layer } from 'effect'

import { layer as FileDropLayer } from '@foldkit/ui/fileDrop'

import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'
import { AttachmentsBlock } from './definition'
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
).pipe(Layer.provide(Layer.mergeAll(FileDropLayer)))

export { AttachmentsBlock } from './definition'
