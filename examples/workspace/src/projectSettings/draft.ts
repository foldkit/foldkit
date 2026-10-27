import { String } from 'effect'

import type { Model } from './model'

export const isDirty = (model: typeof Model.Type) =>
  String.trim(model.draft.name) !== model.baseline.name ||
  model.draft.description !== model.baseline.description
