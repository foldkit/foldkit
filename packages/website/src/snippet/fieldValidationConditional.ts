import { type Validation, maxLength, required } from 'foldkit/fieldValidation'

// The validation list is a function that takes whatever state it depends
// on. Spread validations in or out based on that state.
const companyNameValidations = (
  accountType: 'Personal' | 'Business',
): ReadonlyArray<Validation<string>> => [
  ...(accountType === 'Business'
    ? [required('Required for business accounts')]
    : []),
  maxLength(100),
]
