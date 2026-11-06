import { String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { makeStep } from './block'
import { SaveProject } from './command'
import { ProjectSettingsComposition } from './composition'
import { draftFromProject, hasUnsavedChanges } from './draft'
import { type Model, type ProjectDraft, SaveState } from './model'
import { OutMessage } from './outMessage'

const editDraft = (transformDraft: (draft: ProjectDraft) => ProjectDraft) =>
  makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        draft: transformDraft,
        saveState: () => SaveState.Idle(),
      }),
    }
  })

const saveProject = makeStep(model => {
  const name = String.trim(model.draft.name)

  if (
    SaveState.guards.Saving(model.saveState) ||
    String.isEmpty(name) ||
    !hasUnsavedChanges(model)
  ) {
    return { model }
  }

  return {
    model: modifyFields(model, { saveState: () => SaveState.Saving() }),
    commands: [
      SaveProject({
        project: modifyFields(model.savedProject, {
          name: () => name,
          description: () => model.draft.description,
        }),
      }),
    ],
  }
})

const handleClickedDiscardChanges = (model: Model) => {
  if (SaveState.guards.Saving(model.saveState)) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      draft: () => draftFromProject(model.savedProject),
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
  SubmittedProjectSettings: saveProject,
  ClickedRetrySave: saveProject,
  ClickedDiscardChanges: handleClickedDiscardChanges,
  SucceededSaveProject: (model, { project }) => {
    if (
      !SaveState.guards.Saving(model.saveState) ||
      project.id !== model.savedProject.id
    ) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        savedProject: () => project,
        draft: () => draftFromProject(project),
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
