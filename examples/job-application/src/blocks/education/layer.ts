import { Effect, Layer } from 'effect'

import { EducationBlock } from './block'
import { EducationEntry as Entry } from './blocks'
import { GenerateEducationEntryId } from './command'
import { EducationComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = EducationBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* EducationComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: GenerateEducationEntryId.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))
