import { CreateIssueDefinition, CreateState, type Model } from './definition'

export const canEditDraft = (model: typeof Model.Type) =>
  !CreateState.guards.Creating(model.createState)

export const editDraft = (
  change: (model: typeof Model.Type) => typeof Model.Type,
) =>
  CreateIssueDefinition.makeStep(model => {
    if (!canEditDraft(model)) {
      return { model }
    }

    return { model: change(model) }
  })
