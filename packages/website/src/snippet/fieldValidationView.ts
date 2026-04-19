import { Array, Match as M } from 'effect'
import { type Field, allValid } from 'foldkit/fieldValidation'

const borderClass = (field: Field) =>
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
const statusIndicator = (field: Field) =>
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

// `allValid` walks each (state, rules) pair; required rules demand `Valid`,
// optional rules also accept `NotValidated`.
const isFormValid = (model: Model): boolean =>
  allValid([
    [model.username, usernameRules],
    [model.email, emailRules],
  ])
