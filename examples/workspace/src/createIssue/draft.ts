import { makeStep } from './definition'
import { CreateState, type Model } from './model'

export const isDraftEditable = (model: typeof Model.Type) =>
  !CreateState.guards.Creating(model.createState)

export const editDraftStep = (
  transformModel: (model: typeof Model.Type) => typeof Model.Type,
) =>
  makeStep(model => {
    if (!isDraftEditable(model)) {
      return { model }
    }

    return { model: transformModel(model) }
  })
