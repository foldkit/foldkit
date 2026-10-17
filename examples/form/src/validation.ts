import { Rule, allValid, makeRules, validate } from 'foldkit/fieldValidation'

import type { Model } from './model'

const nameRules = makeRules({
  rules: [Rule.minLength(2, 'Name must be at least 2 characters')],
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

export const validateName = validate(nameRules)
export const validateEmail = validate(emailRules)

export const isFormValid = (model: Model): boolean =>
  allValid([
    [model.name, nameRules],
    [model.email, emailRules],
  ])
