import { validate } from 'foldkit/fieldValidation'

import { OutMessage, makeFieldsStep, makeOutMessageStep } from './block'
import { EducationEntryComposition } from './composition'
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
