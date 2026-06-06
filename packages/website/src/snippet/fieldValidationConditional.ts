import { Rule, makeRules, validate } from 'foldkit/fieldValidation'

// A function that builds the bundle from whatever state it depends on.
const companyNameRules = (accountType: 'Personal' | 'Business') =>
  makeRules({
    ...(accountType === 'Business' && {
      required: 'Required for business accounts',
    }),
    rules: [Rule.maxLength(100)],
  })

const validateCompanyName = (
  accountType: 'Personal' | 'Business',
  value: string,
) => validate(companyNameRules(accountType))(value)
