import { revealFieldErrors } from '../../../../step/validation'
import { makeFieldsStep } from './block'
import { EducationEntryComposition } from './composition'
import { degreeRules, fieldOfStudyRules, schoolRules } from './validation'

export const inMessageUpdate = EducationEntryComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    school: revealFieldErrors(schoolRules),
    degree: revealFieldErrors(degreeRules),
    fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
  })),
})
