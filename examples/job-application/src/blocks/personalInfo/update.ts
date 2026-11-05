import { Match, Number } from 'effect'
import { Validating, validate } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep } from './block'
import { ValidateEmailAsync } from './command'
import { PersonalInfoComposition } from './composition'
import {
  emailRules,
  firstNameRules,
  lastNameRules,
  phoneRules,
  portfolioUrlRules,
} from './validation'

const validateFirstName = validate(firstNameRules)
const validateLastName = validate(lastNameRules)
const validateEmail = validate(emailRules)
const validatePhone = validate(phoneRules)
const validatePortfolioUrl = validate(portfolioUrlRules)

export const update = PersonalInfoComposition.makeUpdate({
  UpdatedFirstName: makeFieldsStep.fromMessage(({ value }) => ({
    firstName: () => validateFirstName(value),
  })),

  UpdatedLastName: makeFieldsStep.fromMessage(({ value }) => ({
    lastName: () => validateLastName(value),
  })),

  UpdatedEmail: (model, { value }) => {
    const validationId = Number.increment(model.emailValidationId)
    return Match.value(validateEmail(value)).pipe(
      Match.tag('Valid', () => ({
        model: modifyFields(model, {
          email: () => Validating({ value }),
          emailValidationId: () => validationId,
        }),
        commands: [ValidateEmailAsync({ emailInput: value, validationId })],
      })),
      Match.orElse(syncResult => ({
        model: modifyFields(model, {
          email: () => syncResult,
          emailValidationId: () => validationId,
        }),
      })),
    )
  },

  CompletedValidateEmailAsync: (model, { validationId, field }) => {
    if (validationId === model.emailValidationId) {
      return { model: modifyFields(model, { email: () => field }) }
    } else {
      return { model }
    }
  },

  UpdatedPhone: makeFieldsStep.fromMessage(({ value }) => ({
    phone: () => validatePhone(value),
  })),

  UpdatedCustomPronouns: makeFieldsStep.fromMessage(({ value }) => ({
    customPronouns: () => value,
  })),

  UpdatedPortfolioUrl: makeFieldsStep.fromMessage(({ value }) => ({
    portfolioUrl: () => validatePortfolioUrl(value),
  })),
})
