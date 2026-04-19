import type { Rule } from 'foldkit/fieldValidation'

const noConsecutiveSpaces: Rule = [
  value => !/  /.test(value),
  'Cannot contain consecutive spaces',
]

const hasUppercase: Rule = [
  value => /[A-Z]/.test(value),
  'Must contain at least one uppercase letter',
]

// Messages can be functions that receive the failing value:
const noTrailingWhitespace: Rule = [
  value => value === value.trimEnd(),
  value => `Remove the trailing whitespace from "${value}"`,
]
