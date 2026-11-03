import { makeRules } from 'foldkit/fieldValidation'

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})
