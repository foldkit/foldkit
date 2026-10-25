import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

import { revealFieldErrors } from '../../validation'
import { EducationEntryComposition } from './composition'
import { EducationEntryDefinition, type Model, OutMessage } from './definition'

export const schoolRules = makeRules({
  required: 'School is required',
})

export const degreeRules = makeRules({
  required: 'Degree is required',
})

export const fieldOfStudyRules = makeRules({
  required: 'Field of study is required',
})

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

export const update = EducationEntryComposition.makeUpdate({
  UpdatedSchool: EducationEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ school: () => validateSchool(value) }),
  ),

  UpdatedDegree: EducationEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ degree: () => validateDegree(value) }),
  ),

  UpdatedFieldOfStudy: EducationEntryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({
      fieldOfStudy: () => validateFieldOfStudy(value),
    }),
  ),

  ToggledCurrentlyEnrolled: EducationEntryDefinition.makeFieldsStep.fromMessage(
    ({ isChecked }) => ({ isCurrentlyEnrolled: () => isChecked }),
  ),

  RequestedRevealErrors: EducationEntryDefinition.makeFieldsStep(() => ({
    school: revealFieldErrors(schoolRules),
    degree: revealFieldErrors(degreeRules),
    fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
  })),

  ClickedRemoveSelf: EducationEntryDefinition.makeOutMessageStep(() =>
    OutMessage.Removed(),
  ),
})

export const hasErrors = (entry: typeof Model.Type): boolean =>
  anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isComplete = (entry: typeof Model.Type): boolean =>
  allValid([
    [entry.school, schoolRules],
    [entry.degree, degreeRules],
    [entry.fieldOfStudy, fieldOfStudyRules],
  ])
