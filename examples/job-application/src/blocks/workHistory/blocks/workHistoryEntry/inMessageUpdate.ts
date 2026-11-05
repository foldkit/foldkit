import { revealFieldErrors } from '../../../../step/validation'
import { makeFieldsStep } from './block'
import { WorkHistoryEntryComposition } from './composition'
import { companyRules, titleRules } from './validation'

export const inMessageUpdate = WorkHistoryEntryComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })),
})
