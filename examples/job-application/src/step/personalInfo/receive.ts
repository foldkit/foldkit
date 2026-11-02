import { revealFieldErrors } from '../validation'
import { PersonalInfoComposition } from './composition'
import { makeFieldsStep } from './definition'
import {
  emailRules,
  firstNameRules,
  lastNameRules,
  phoneRules,
  portfolioUrlRules,
} from './validation'

export const receive = PersonalInfoComposition.makeReceive({
  RequestedRevealErrors: makeFieldsStep(() => ({
    firstName: revealFieldErrors(firstNameRules),
    lastName: revealFieldErrors(lastNameRules),
    email: revealFieldErrors(emailRules),
    phone: revealFieldErrors(phoneRules),
    portfolioUrl: revealFieldErrors(portfolioUrlRules),
  })),
})
