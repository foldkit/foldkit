import { Schema } from 'effect'
import { Field, Rule, makeRules } from 'foldkit/fieldValidation'

// Optional: no `required` option. The rule applies when the user fills it in.
const usernameRules = makeRules({
  rules: [Rule.minLength(3, 'Must be at least 3 characters')],
})

// Required: empty values become `Invalid` with the given message.
const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

// Non-string fields work too. The value Schema is what the control holds,
// so a multi-select holds an array. Annotate the value type on `makeRules`.
const interestsRules = makeRules<ReadonlyArray<string>>({
  required: 'Pick at least one interest',
  rules: [Rule.maxItems(5, 'Choose up to five')],
})

const Model = Schema.Struct({
  username: Field(Schema.String),
  email: Field(Schema.String),
  interests: Field(Schema.Array(Schema.String)),
})
type Model = typeof Model.Type
