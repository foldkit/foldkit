import { Array } from 'effect'
import { FieldValidation } from 'foldkit'
import { type Field, allValid } from 'foldkit/fieldValidation'
import type { HtmlBuilder } from 'foldkit/html'

const borderClass = (field: Field<string>) =>
  FieldValidation.match(field, {
    onNotValidated: () => 'border-gray-300',
    onValidating: () => 'border-accent-300',
    onValid: () => 'border-accent-500',
    onInvalid: () => 'border-red-500',
  })

const statusIndicator = (field: Field<string>, h: HtmlBuilder<Message>) =>
  FieldValidation.match(field, {
    onNotValidated: () => h.empty,
    onValidating: () => h.span([], ['Checking...']),
    onValid: () => h.span([], ['✓']),
    onInvalid: ({ errors }) => h.div([], [Array.headNonEmpty(errors)]),
  })

// `allValid` gates fields of one value type per call; required rules demand
// `Valid`, optional rules also accept `NotValidated`. For a form that mixes
// value types, call `allValid` per type and combine with `&&`.
const isFormValid = (model: Model): boolean =>
  allValid([
    [model.username, usernameRules],
    [model.email, emailRules],
  ])
