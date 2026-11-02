import { Effect, Layer } from 'effect'

import { RadioGroup } from '@foldkit/ui'

import { ProficiencyRadioGroupBinding } from './composition'
import { SkillsEntryDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const SkillsEntryBlock = SkillsEntryDefinition.contract
export const layer = SkillsEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const proficiencyRadioGroup = yield* ProficiencyRadioGroupBinding

    return { children: [proficiencyRadioGroup], init, update, receive, view }
  }),
).provide(Layer.mergeAll(RadioGroup.layer)).layer
