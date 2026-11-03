import { allValid, anyInvalid, makeRules } from 'foldkit/fieldValidation'

import type { Model } from './definition'

export const nameRules = makeRules({
  required: 'Skill name is required',
})

export const hasErrors = (entry: Model) => anyInvalid([entry.name])

export const isComplete = (entry: Model) => allValid([[entry.name, nameRules]])
