import { String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SaveProject } from './command'
import { ProjectSettingsComposition } from './composition'
import {
  type Model,
  OutMessage,
  type ProjectDraft,
  ProjectSettingsDefinition,
  SaveState,
} from './definition'
import { isDirty } from './draft'

const editDraft = (
  change: (draft: typeof ProjectDraft.Type) => typeof ProjectDraft.Type,
) =>
  ProjectSettingsDefinition.makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        draft: change,
        saveState: () => SaveState.Idle(),
      }),
    }
  })

const save = ProjectSettingsDefinition.makeStep(model => {
  const name = String.trim(model.draft.name)

  if (
    SaveState.guards.Saving(model.saveState) ||
    String.isEmpty(name) ||
    !isDirty(model)
  ) {
    return { model }
  }

  return {
    model: modifyFields(model, { saveState: () => SaveState.Saving() }),
    commands: [
      SaveProject({
        project: modifyFields(model.baseline, {
          name: () => name,
          description: () => model.draft.description,
        }),
      }),
    ],
  }
})

const handleClickedDiscardChanges = (model: typeof Model.Type) => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      draft: () => ({
        name: model.baseline.name,
        description: model.baseline.description,
      }),
      saveState: () => SaveState.Idle(),
    }),
  }
}

export const update = ProjectSettingsComposition.makeUpdate({
  UpdatedProjectName: (model, { value }) =>
    editDraft(draft => modifyFields(draft, { name: () => value }))(model),
  UpdatedProjectDescription: (model, { value }) =>
    editDraft(draft => modifyFields(draft, { description: () => value }))(
      model,
    ),
  SubmittedProjectSettings: save,
  ClickedRetrySave: save,
  ClickedDiscardChanges: handleClickedDiscardChanges,
  SucceededSaveProject: (model, { project }) => {
    if (
      !SaveState.guards.Saving(model.saveState) ||
      project.id !== model.baseline.id
    ) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        baseline: () => project,
        draft: () => ({ name: project.name, description: project.description }),
        saveState: () => SaveState.Saved(),
      }),
      outMessage: OutMessage.Saved({ project }),
    }
  },
  FailedSaveProject: (model, { error }) => {
    if (!SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        saveState: () => SaveState.Failed({ error }),
      }),
    }
  },
})
