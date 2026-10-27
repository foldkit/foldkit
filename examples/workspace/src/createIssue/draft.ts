import { makeStep } from './definition'
import { CreateState, type Model } from './model'

export const canEditDraft = (model: typeof Model.Type) =>
  !CreateState.guards.Creating(model.createState)

export const editDraftStep = (
  change: (model: typeof Model.Type) => typeof Model.Type,
) =>
  makeStep(model => {
    if (!canEditDraft(model)) {
      return { model }
    }

    return { model: change(model) }
  })
