import { makeStep } from './definition'
import { CreateState, type Model } from './model'

export const isDraftEditable = (model: Model) =>
  !CreateState.guards.Creating(model.createState)

export const editDraftStep = (transformModel: (model: Model) => Model) =>
  makeStep(model => {
    if (!isDraftEditable(model)) {
      return { model }
    }

    return { model: transformModel(model) }
  })
