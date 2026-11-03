import { revealFieldErrors } from '../../../../step/validation'
import { EducationEntryComposition } from './composition'
import { makeFieldsStep } from './definition'
import { degreeRules, fieldOfStudyRules, schoolRules } from './validation'

export const receive = EducationEntryComposition.makeReceive({
  RequestedRevealErrors: makeFieldsStep(() => ({
    school: revealFieldErrors(schoolRules),
    degree: revealFieldErrors(degreeRules),
    fieldOfStudy: revealFieldErrors(fieldOfStudyRules),
  })),
})
