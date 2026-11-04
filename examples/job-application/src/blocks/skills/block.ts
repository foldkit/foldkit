import { Effect, Layer } from 'effect'

import { SkillsEntry as Entry } from './blocks'
import { EffectsLayer } from './command'
import { EntriesBinding } from './composition'
import { SkillsBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SkillsBlock.makeLayer(
  Effect.gen(function* () {
    const entries = yield* EntriesBinding

    return {
      children: [entries],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Entry.layer)))

export { SkillsBlock } from './definition'
