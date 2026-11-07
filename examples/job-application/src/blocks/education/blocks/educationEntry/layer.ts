import { Effect, Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { EducationEntryBlock } from './block'
import { EducationEntryComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = EducationEntryBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* EducationEntryComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Listbox.layer)))
