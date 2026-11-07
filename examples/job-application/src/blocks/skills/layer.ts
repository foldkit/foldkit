import { Effect, Layer } from 'effect'

import { SkillsBlock } from './block'
import { SkillsEntry as Entry } from './blocks'
import { GenerateSkillsEntryId } from './command'
import { SkillsComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SkillsBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* SkillsComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: GenerateSkillsEntryId.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))
