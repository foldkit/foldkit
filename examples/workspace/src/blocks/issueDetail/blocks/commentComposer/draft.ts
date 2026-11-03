import { String } from 'effect'

import { type Model, PostState } from './model'

export const isDraftEditable = (model: Model) =>
  !PostState.guards.Posting(model.postState)

export const isDraftNonEmpty = (model: Model) => String.isNonEmpty(model.body)
