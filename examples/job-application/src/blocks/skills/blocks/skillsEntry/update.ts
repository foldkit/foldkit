import { allValid, anyInvalid, validate } from 'foldkit/fieldValidation'

import { SkillsEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'
import { nameRules } from './validation'

const validateName = validate(nameRules)

export const update = SkillsEntryComposition.makeUpdate({
  UpdatedName: makeFieldsStep.fromMessage(({ value }) => ({
    name: () => validateName(value),
  })),

  ClickedRemoveSelf: makeOutMessageStep(() => OutMessage.Removed()),
})

export const hasErrors = (entry: Model) => anyInvalid([entry.name])

export const isComplete = (entry: Model) => allValid([[entry.name, nameRules]])
