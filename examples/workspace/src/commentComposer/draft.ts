import { String } from 'effect'

import { type Model, PostState } from './model'

export const isDraftEditable = (model: typeof Model.Type) =>
  !PostState.guards.Posting(model.postState)

export const isDraftNonEmpty = (model: typeof Model.Type) =>
  String.isNonEmpty(model.body)
