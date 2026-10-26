import { Match, Number } from 'effect'
import {
  Field,
  Rule,
  Validating,
  allValid,
  anyInvalid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { revealFieldErrors } from '../validation'
import { ValidateEmailAsync } from './command'
import { PersonalInfoComposition } from './composition'
import { type Model, makeFieldsStep } from './definition'

const firstNameRules = makeRules({
  required: 'First name is required',
  rules: [Rule.minLength(2, 'First name must be at least 2 characters')],
})

const lastNameRules = makeRules({
  required: 'Last name is required',
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/

const phoneRules = makeRules({
  rules: [Rule.pattern(PHONE_PATTERN, 'Please enter a valid phone number')],
})

const portfolioUrlRules = makeRules({
  rules: [
    Rule.url({
      message: 'Please enter a valid URL',
      requireProtocol: false,
    }),
  ],
})

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

  RequestedRevealErrors: makeFieldsStep(() => ({
    firstName: revealFieldErrors(firstNameRules),
    lastName: revealFieldErrors(lastNameRules),
    email: revealFieldErrors(emailRules),
    phone: revealFieldErrors(phoneRules),
    portfolioUrl: revealFieldErrors(portfolioUrlRules),
  })),

  UpdatedCustomPronouns: makeFieldsStep.fromMessage(({ value }) => ({
    customPronouns: () => value,
  })),

  UpdatedPortfolioUrl: makeFieldsStep.fromMessage(({ value }) => ({
    portfolioUrl: () => validatePortfolioUrl(value),
  })),
})

const validatedFields = (
  model: typeof Model.Type,
): ReadonlyArray<Field<string>> => [
  model.firstName,
  model.lastName,
  model.email,
  model.phone,
  model.portfolioUrl,
]

export const hasErrors = (model: typeof Model.Type): boolean =>
  anyInvalid(validatedFields(model))

export const isComplete = (model: typeof Model.Type): boolean =>
  allValid([
    [model.firstName, firstNameRules],
    [model.lastName, lastNameRules],
    [model.email, emailRules],
    [model.phone, phoneRules],
    [model.portfolioUrl, portfolioUrlRules],
  ])
