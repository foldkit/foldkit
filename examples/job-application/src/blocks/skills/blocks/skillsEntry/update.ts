import { validate } from 'foldkit/fieldValidation'

import { OutMessage, makeFieldsStep, makeOutMessageStep } from './block'
import { SkillsEntryComposition } from './composition'
import { nameRules } from './validation'

const validateName = validate(nameRules)

export const update = SkillsEntryComposition.makeUpdate({
  UpdatedName: makeFieldsStep.fromMessage(({ value }) => ({
    name: () => validateName(value),
  })),

  ClickedRemoveSelf: makeOutMessageStep(() => OutMessage.Removed()),
})
