import { CreateState, type Model, makeStep } from './definition'

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
