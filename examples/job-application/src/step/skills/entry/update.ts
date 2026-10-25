import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

import { revealFieldErrors } from '../../validation'
import { SkillsEntryComposition } from './composition'
import { type Model, OutMessage, SkillsEntryDefinition } from './definition'

export const nameRules = makeRules({
  required: 'Skill name is required',
})

const validateName = validate(nameRules)

export const update = SkillsEntryComposition.makeUpdate({
  UpdatedName: SkillsEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ name: () => validateName(value) }),
  ),

  RequestedRevealErrors: SkillsEntryDefinition.makeFieldsStep(() => ({
    name: revealFieldErrors(nameRules),
  })),

  ClickedRemoveSelf: SkillsEntryDefinition.makeOutMessageStep(() =>
    OutMessage.Removed(),
  ),
})

export const hasErrors = (entry: typeof Model.Type) => anyInvalid([entry.name])

export const isComplete = (entry: typeof Model.Type) =>
  allValid([[entry.name, nameRules]])
