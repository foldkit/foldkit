import { String } from 'effect'

import { type Model, PostState } from './definition'

export const canEditDraft = (model: typeof Model.Type) =>
  !PostState.guards.Posting(model.postState)

export const hasDraft = (model: typeof Model.Type) =>
  String.isNonEmpty(model.body)
