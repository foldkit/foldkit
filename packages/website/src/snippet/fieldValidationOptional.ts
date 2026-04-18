import {
  type Validation,
  email,
  maxLength,
  minLength,
  optional,
  pattern,
  required,
} from 'foldkit/fieldValidation'

// Required: field must be filled in, and must satisfy every rule.
const requiredUsername: ReadonlyArray<Validation<string>> = [
  required('Username is required'),
  minLength(3, 'Must be at least 3 characters'),
  maxLength(20, value => `Too long (${value.length}/20)`),
  pattern(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only'),
]

// Optional: field may be empty; if filled in, all rules apply.
// Drop `required()` and map `optional` across the remaining rules.
const optionalUsername: ReadonlyArray<Validation<string>> = [
  minLength(3, 'Must be at least 3 characters'),
  maxLength(20, value => `Too long (${value.length}/20)`),
  pattern(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only'),
].map(optional)

// For a single validator, inline wrapping works just as well:
const optionalEmail: ReadonlyArray<Validation<string>> = [
  optional(email('Please enter a valid email address')),
]
