import { allValid, anyInvalid, validate } from 'foldkit/fieldValidation'

import { EducationEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'
import { degreeRules, fieldOfStudyRules, schoolRules } from './validation'

const validateSchool = validate(schoolRules)
const validateDegree = validate(degreeRules)
const validateFieldOfStudy = validate(fieldOfStudyRules)

export const update = EducationEntryComposition.makeUpdate({
  UpdatedSchool: makeFieldsStep.fromMessage(({ value }) => ({
    school: () => validateSchool(value),
  })),

  UpdatedDegree: makeFieldsStep.fromMessage(({ value }) => ({
    degree: () => validateDegree(value),
  })),

  UpdatedFieldOfStudy: makeFieldsStep.fromMessage(({ value }) => ({
    fieldOfStudy: () => validateFieldOfStudy(value),
  })),

  ToggledCurrentlyEnrolled: makeFieldsStep.fromMessage(({ isChecked }) => ({
    isCurrentlyEnrolled: () => isChecked,
  })),

  ClickedRemoveSelf: makeOutMessageStep(() => OutMessage.Removed()),
})

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.school, entry.degree, entry.fieldOfStudy])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.school, schoolRules],
    [entry.degree, degreeRules],
    [entry.fieldOfStudy, fieldOfStudyRules],
  ])
