import { FieldValidation } from 'foldkit'
import type { Validation } from 'foldkit/fieldValidation'

const usernameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Username is required'),
  FieldValidation.minLength(3, 'Must be at least 3 characters'),
  FieldValidation.maxLength(
    20,
    value => `Too long (${value.length}/20)`,
  ),
  FieldValidation.pattern(
    /^[a-zA-Z0-9_]+$/,
    'Letters, numbers, and underscores only',
  ),
]

const emailValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email address'),
]
