import { revealFieldErrors } from '../../../../step/validation'
import { SkillsEntryComposition } from './composition'
import { makeFieldsStep } from './definition'
import { nameRules } from './validation'

export const inMessageUpdate = SkillsEntryComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    name: revealFieldErrors(nameRules),
  })),
})
