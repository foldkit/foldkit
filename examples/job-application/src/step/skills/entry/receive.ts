import { revealFieldErrors } from '../../validation'
import { SkillsEntryComposition } from './composition'
import { makeFieldsStep } from './definition'
import { nameRules } from './validation'

export const receive = SkillsEntryComposition.makeReceive({
  RequestedRevealErrors: makeFieldsStep(() => ({
    name: revealFieldErrors(nameRules),
  })),
})
