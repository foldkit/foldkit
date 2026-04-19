import { makeRules, maxLength, validate } from 'foldkit/fieldValidation'

// A function that builds the bundle from whatever state it depends on.
const companyNameRules = (accountType: 'Personal' | 'Business') =>
  makeRules({
    ...(accountType === 'Business' && {
      required: 'Required for business accounts',
    }),
    rules: [maxLength(100)],
  })

const validateCompanyName = (
  accountType: 'Personal' | 'Business',
  value: string,
) => validate(companyNameRules(accountType))(value)
