import { revealFieldErrors } from '../../step/validation'
import { makeFieldsStep } from './block'
import { PersonalInfoComposition } from './composition'
import {
  emailRules,
  firstNameRules,
  lastNameRules,
  phoneRules,
  portfolioUrlRules,
} from './validation'

export const inMessageUpdate = PersonalInfoComposition.makeInMessageUpdate({
  RequestedRevealErrors: makeFieldsStep(() => ({
    firstName: revealFieldErrors(firstNameRules),
    lastName: revealFieldErrors(lastNameRules),
    email: revealFieldErrors(emailRules),
    phone: revealFieldErrors(phoneRules),
    portfolioUrl: revealFieldErrors(portfolioUrlRules),
  })),
})
