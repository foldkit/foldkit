import { Array, Match as M } from 'effect'
import { type Field, allValid } from 'foldkit/fieldValidation'

const borderClass = (field: Field<string>) =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-accent-300',
      Valid: () => 'border-accent-500',
      Invalid: () => 'border-red-500',
    }),
  )

// Branching views are wrapped in `keyed` so snabbdom patches the right tree
// when the tag flips.
const statusIndicator = (field: Field<string>) =>
  keyed('span')(
    field._tag,
    [],
    [
      M.value(field).pipe(
        M.tagsExhaustive({
          NotValidated: () => empty,
          Validating: () => span([], ['Checking...']),
          Valid: () => span([], ['✓']),
          Invalid: ({ errors }) => div([], [Array.headNonEmpty(errors)]),
        }),
      ),
    ],
  )

// `allValid` gates fields of one value type per call; required rules demand
// `Valid`, optional rules also accept `NotValidated`. For a form that mixes
// value types, call `allValid` per type and combine with `&&`.
const isFormValid = (model: Model): boolean =>
  allValid([
    [model.username, usernameRules],
    [model.email, emailRules],
  ])
