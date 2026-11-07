import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { SkillsEntryBlock } from './block'
import { SkillsEntryComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SkillsEntryBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* SkillsEntryComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroup.layer)))
