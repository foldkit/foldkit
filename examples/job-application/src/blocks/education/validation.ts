import { Array } from 'effect'

import { EducationEntry } from './blocks'
import type { Model } from './definition'

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, EducationEntry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, EducationEntry.isComplete)
