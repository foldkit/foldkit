import {
  type Field,
  Rule,
  allValid,
  anyInvalid,
  makeRules,
} from 'foldkit/fieldValidation'

import type { Model } from './block'

export const firstNameRules = makeRules({
  required: 'First name is required',
  rules: [Rule.minLength(2, 'First name must be at least 2 characters')],
})

export const lastNameRules = makeRules({
  required: 'Last name is required',
})

export const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

const PHONE_PATTERN = /^\+?[\d\s()-]{7,}$/

export const phoneRules = makeRules({
  rules: [Rule.pattern(PHONE_PATTERN, 'Please enter a valid phone number')],
})

export const portfolioUrlRules = makeRules({
  rules: [
    Rule.url({
      message: 'Please enter a valid URL',
      requireProtocol: false,
    }),
  ],
})

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
