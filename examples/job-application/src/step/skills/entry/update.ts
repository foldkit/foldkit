import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

import { revealFieldErrors } from '../../validation'
import { SkillsEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'

export const nameRules = makeRules({
  required: 'Skill name is required',
})

const validateName = validate(nameRules)

export const update = SkillsEntryComposition.makeUpdate({
  UpdatedName: makeFieldsStep.fromMessage(({ value }) => ({
    name: () => validateName(value),
  })),

  RequestedRevealErrors: makeFieldsStep(() => ({
    name: revealFieldErrors(nameRules),
  })),

  ClickedRemoveSelf: makeOutMessageStep(() => OutMessage.Removed()),
})

export const hasErrors = (entry: Model) => anyInvalid([entry.name])

export const isComplete = (entry: Model) => allValid([[entry.name, nameRules]])
