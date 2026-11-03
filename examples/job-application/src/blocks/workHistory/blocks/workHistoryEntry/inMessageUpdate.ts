import { revealFieldErrors } from '../../../../step/validation'
import { WorkHistoryEntryComposition } from './composition'
import { makeFieldsStep } from './definition'
import { companyRules, titleRules } from './validation'

export const inMessageUpdate = WorkHistoryEntryComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })),
})
