import { type Model, PostState } from './definition'

export const canEditDraft = (model: typeof Model.Type) =>
  !PostState.guards.Posting(model.postState)
