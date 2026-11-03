import { Effect, Layer } from 'effect'

import { SkillsEntry as Entry } from './blocks'
import { EffectsLayer } from './command'
import { EntriesBinding } from './composition'
import { SkillsDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const SkillsBlock = SkillsDefinition.contract
export const layer = SkillsDefinition.makeBlock(
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
).provide(Layer.mergeAll(Entry.layer)).layer
