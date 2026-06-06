import { Rule } from 'foldkit/fieldValidation'

const noConsecutiveSpaces: Rule.Rule<string> = [
  value => !/  /.test(value),
  'Cannot contain consecutive spaces',
]

const hasUppercase: Rule.Rule<string> = [
  value => /[A-Z]/.test(value),
  'Must contain at least one uppercase letter',
]

// Messages can be functions that receive the failing value:
const noTrailingWhitespace: Rule.Rule<string> = [
  value => value === value.trimEnd(),
  value => `Remove the trailing whitespace from "${value}"`,
]
