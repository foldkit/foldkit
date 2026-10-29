import {
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

import { revealFieldErrors } from '../../validation'
import { EducationEntryComposition } from './composition'
import {
  type Model,
  OutMessage,
  makeFieldsStep,
  makeOutMessageStep,
} from './definition'

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

  RequestedRevealErrors: makeFieldsStep(() => ({
    school: revealFieldErrors(schoolRules),
    degree: revealFieldErrors(degreeRules),
    fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
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
