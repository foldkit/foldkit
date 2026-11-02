import { Effect, Layer } from 'effect'

import { FileDrop } from '@foldkit/ui'

import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'
import { AttachmentsDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const AttachmentsBlock = AttachmentsDefinition.contract
export const layer = AttachmentsDefinition.makeBlock(
  Effect.gen(function* () {
    const resumeDrop = yield* ResumeDropBinding
    const additionalFilesDrop = yield* AdditionalFilesDropBinding

    return { children: [resumeDrop, additionalFilesDrop], init, update, view }
  }),
).provide(Layer.mergeAll(FileDrop.layer)).layer
