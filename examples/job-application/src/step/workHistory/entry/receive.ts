import { revealFieldErrors } from '../../validation'
import { WorkHistoryEntryComposition } from './composition'
import { makeFieldsStep } from './definition'
import { companyRules, titleRules } from './validation'

export const receive = WorkHistoryEntryComposition.makeReceive({
  RequestedRevealErrors: makeFieldsStep(() => ({
    company: revealFieldErrors(companyRules),
    title: revealFieldErrors(titleRules),
  })),
})
