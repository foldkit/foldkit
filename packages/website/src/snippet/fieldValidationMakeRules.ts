import { Schema as S } from 'effect'
import { Field, email, makeRules, minLength } from 'foldkit/fieldValidation'

// Optional: no `required` option. The rule applies when the user fills it in.
const usernameRules = makeRules({
  rules: [minLength(3, 'Must be at least 3 characters')],
})

// Required: empty values become `Invalid` with the given message.
const emailRules = makeRules({
  required: 'Email is required',
  rules: [email('Please enter a valid email address')],
})

const Model = S.Struct({
  username: Field,
  email: Field,
})
type Model = typeof Model.Type
