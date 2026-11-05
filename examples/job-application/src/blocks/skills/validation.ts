import { Array } from 'effect'

import type { Model } from './block'
import { SkillsEntry } from './blocks'

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, SkillsEntry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, SkillsEntry.isComplete)
