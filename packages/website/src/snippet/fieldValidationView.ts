import { Array, Match as M } from 'effect'

const borderClass = (field: StringField) =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-accent-300',
      Valid: () => 'border-accent-500',
      Invalid: () => 'border-red-500',
    }),
  )

const statusIndicator = (field: StringField) =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => empty,
      Validating: () => span([], ['Checking...']),
      Valid: () => span([], ['✓']),
      Invalid: ({ errors }) => div([], [Array.headNonEmpty(errors)]),
    }),
  )

const isFormValid = (model: Model): boolean =>
  Array.every([model.username, model.email], field => field._tag === 'Valid')
