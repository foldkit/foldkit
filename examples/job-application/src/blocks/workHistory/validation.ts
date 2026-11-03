import { Array } from 'effect'

import { WorkHistoryEntry } from './blocks'
import type { Model } from './definition'

export const hasErrors = (model: Model): boolean =>
  Array.some(model.entries, WorkHistoryEntry.hasErrors)

export const isComplete = (model: Model): boolean =>
  Array.isReadonlyArrayNonEmpty(model.entries) &&
  Array.every(model.entries, WorkHistoryEntry.isComplete)
