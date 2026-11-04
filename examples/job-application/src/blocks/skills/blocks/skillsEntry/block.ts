import { Effect, Layer } from 'effect'

import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'

import { ProficiencyRadioGroupBinding } from './composition'
import { SkillsEntryBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SkillsEntryBlock.makeLayer(
  Effect.gen(function* () {
    const proficiencyRadioGroup = yield* ProficiencyRadioGroupBinding

    return {
      children: [proficiencyRadioGroup],
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(RadioGroupLayer)))

export { SkillsEntryBlock } from './definition'
