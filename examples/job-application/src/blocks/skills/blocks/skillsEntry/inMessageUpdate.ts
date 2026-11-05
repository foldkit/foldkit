import { revealFieldErrors } from '../../../../step/validation'
import { makeFieldsStep } from './block'
import { SkillsEntryComposition } from './composition'
import { nameRules } from './validation'

export const inMessageUpdate = SkillsEntryComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    name: revealFieldErrors(nameRules),
  })),
})
