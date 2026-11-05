import { allValid, anyInvalid, makeRules } from 'foldkit/fieldValidation'

import type { Model } from './block'

export const companyRules = makeRules({
  required: 'Company is required',
})

export const titleRules = makeRules({
  required: 'Job title is required',
})

export const hasErrors = (entry: Model): boolean =>
  anyInvalid([entry.company, entry.title])

export const isComplete = (entry: Model): boolean =>
  allValid([
    [entry.company, companyRules],
    [entry.title, titleRules],
  ])
