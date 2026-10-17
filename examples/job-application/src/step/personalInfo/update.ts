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
import { Message, type Model } from './definition'

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

export const update = PersonalInfoComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedFirstName: ({ value }) => ({
      model: modifyFields(model, { firstName: () => validateFirstName(value) }),
    }),

    UpdatedLastName: ({ value }) => ({
      model: modifyFields(model, { lastName: () => validateLastName(value) }),
    }),

    UpdatedEmail: ({ value }) => {
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

    CompletedValidateEmailAsync: ({ validationId, field }) => {
      if (validationId === model.emailValidationId) {
        return { model: modifyFields(model, { email: () => field }) }
      } else {
        return { model }
      }
    },

    UpdatedPhone: ({ value }) => ({
      model: modifyFields(model, { phone: () => validatePhone(value) }),
    }),

    UpdatedCustomPronouns: ({ value }) => ({
      model: modifyFields(model, { customPronouns: () => value }),
    }),

    UpdatedPortfolioUrl: ({ value }) => ({
      model: modifyFields(model, {
        portfolioUrl: () => validatePortfolioUrl(value),
      }),
    }),
  }),
)

const validatedFields = (model: Model): ReadonlyArray<Field<string>> => [
  model.firstName,
  model.lastName,
  model.email,
  model.phone,
  model.portfolioUrl,
]

export const hasErrors = (model: Model): boolean =>
  anyInvalid(validatedFields(model))

export const isComplete = (model: Model): boolean =>
  allValid([
    [model.firstName, firstNameRules],
    [model.lastName, lastNameRules],
    [model.email, emailRules],
    [model.phone, phoneRules],
    [model.portfolioUrl, portfolioUrlRules],
  ])

export const revealErrors = (model: Model): Model =>
  modifyFields(model, {
    firstName: revealFieldErrors(firstNameRules),
    lastName: revealFieldErrors(lastNameRules),
    email: revealFieldErrors(emailRules),
    phone: revealFieldErrors(phoneRules),
    portfolioUrl: revealFieldErrors(portfolioUrlRules),
  })
