import {
  type Validation,
  email,
  maxLength,
  minLength,
  pattern,
  required,
} from 'foldkit/fieldValidation'

const usernameValidations: ReadonlyArray<Validation<string>> = [
  required('Username is required'),
  minLength(3, 'Must be at least 3 characters'),
  maxLength(20, value => `Too long (${value.length}/20)`),
  pattern(
    /^[a-zA-Z0-9_]+$/,
    'Letters, numbers, and underscores only',
  ),
]

const emailValidations: ReadonlyArray<Validation<string>> = [
  required('Email is required'),
  email('Please enter a valid email address'),
]
